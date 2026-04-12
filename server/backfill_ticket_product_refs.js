import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "./api/config/connectDB.js";
import Ticket from "./api/models/ticket.model.js";
import { ensureAICatalogSynced, resolveProductAndDepartment } from "./api/services/aiCatalog.service.js";

dotenv.config();

const getCandidateProductName = (ticket) => {
  return (
    ticket.productName ||
    ticket?.classificationMeta?.neuro_symbolic?.product ||
    ticket?.classificationMeta?.llm_classification?.product ||
    ""
  );
};

const backfillTicketRefs = async () => {
  try {
    await connectDB();
    await ensureAICatalogSynced(false);

    const query = {
      $or: [
        { departmentRef: { $exists: false } },
        { departmentRef: null },
        { productName: { $exists: false } },
        { productName: null },
      ],
    };

    const tickets = await Ticket.find(query).select(
      "ticketId department departmentRef productName classificationMeta"
    );

    let updated = 0;
    let skipped = 0;

    for (const ticket of tickets) {
      const candidateProductName = getCandidateProductName(ticket);
      const candidateDepartmentName = ticket.department;

      if (!candidateDepartmentName && !candidateProductName) {
        skipped += 1;
        continue;
      }

      const resolved = await resolveProductAndDepartment({
        productName: candidateProductName,
        departmentName: candidateDepartmentName,
        allowCreate: true,
      });

      const patch = {};

      if (resolved.departmentDoc?._id) {
        patch.departmentRef = resolved.departmentDoc._id;
        patch.department = resolved.departmentDoc.name;
      }

      if (resolved.productName) {
        patch.productName = resolved.productName;
      }

      if (Object.keys(patch).length === 0) {
        skipped += 1;
        continue;
      }

      await Ticket.updateOne({ _id: ticket._id }, { $set: patch });
      updated += 1;
    }

    console.log(`Backfill complete. Updated: ${updated}, Skipped: ${skipped}, Total scanned: ${tickets.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
};

backfillTicketRefs();
