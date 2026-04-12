import crypto from "crypto";

import Department from "../models/department.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

const SYSTEM_EMAIL = "system@ticketing.local";
const SYSTEM_PROFILE_PIC =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

const AI_CATALOG = [
  {
    name: "E-Tendering",
    description:
      "Platform for managing tenders, bids, and vendor registration.",
    teams: [
      "Vendor Onboarding & Reg",
      "PKI & Digital Signature",
      "Tender & Bidding Support",
      "EMD & Payment Gateway",
      "Portal Technical Support",
    ],
  },
  {
    name: "SAP",
    description: "Enterprise Resource Planning system for internal operations.",
    teams: [
      "SAP Security & GRC",
      "Plant Maintenance Support",
      "MM & Finance Support",
      "HR ESS Portal Team",
      "BASIS & Technical",
    ],
  },
];

const PRODUCT_ALIAS_PAIRS = [
  ["sap", "SAP"],
  ["sap erp", "SAP"],
  ["sap erp system", "SAP"],
  ["etendering", "E-Tendering"],
  ["e tendering", "E-Tendering"],
  ["e tendering portal", "E-Tendering"],
  ["etendering portal", "E-Tendering"],
  ["powergrid portal", "E-Tendering"],
  ["pranit", "E-Tendering"],
  ["e-tendering portal", "E-Tendering"],
];

const PRODUCT_ALIASES = new Map();

const normalizeWhitespace = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizeAliasKey = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

for (const product of AI_CATALOG) {
  PRODUCT_ALIASES.set(normalizeAliasKey(product.name), product.name);
}
for (const [alias, target] of PRODUCT_ALIAS_PAIRS) {
  PRODUCT_ALIASES.set(normalizeAliasKey(alias), target);
}

let catalogSynced = false;

const findProductByNameInsensitive = async (name) => {
  if (!name) return null;
  const pattern = `^${escapeRegex(name)}$`;
  return Product.findOne({
    name: { $regex: pattern, $options: "i" },
    isActive: true,
  });
};

const findDepartmentByNameInsensitive = async (departmentName, productId = null) => {
  if (!departmentName) return null;
  const pattern = `^${escapeRegex(departmentName)}$`;
  const query = {
    name: { $regex: pattern, $options: "i" },
    isActive: true,
  };

  if (productId) {
    query.product = productId;
  }

  return Department.findOne(query).populate("product", "name");
};

const getCatalogOwner = async () => {
  let owner = await User.findOne({ role: "super-admin" });
  if (owner) return owner;

  owner = await User.findOne({ role: "admin" });
  if (owner) return owner;

  owner = await User.findOne({ email: SYSTEM_EMAIL });
  if (owner) return owner;

  owner = await User.findOne({});
  if (owner) return owner;

  return User.create({
    email: SYSTEM_EMAIL,
    name: "System Bot",
    password: crypto.randomBytes(32).toString("hex"),
    role: "admin",
    department: "IT",
    profilePicture: SYSTEM_PROFILE_PIC,
  });
};

export const canonicalizeProductName = (productName) => {
  if (!productName) return "";
  const key = normalizeAliasKey(productName);
  return PRODUCT_ALIASES.get(key) || normalizeWhitespace(productName);
};

export const ensureAICatalogSynced = async (force = false) => {
  if (catalogSynced && !force) {
    return;
  }

  const owner = await getCatalogOwner();

  for (const productSpec of AI_CATALOG) {
    let productDoc = await findProductByNameInsensitive(productSpec.name);

    if (!productDoc) {
      productDoc = await Product.create({
        name: productSpec.name,
        description: productSpec.description,
        createdBy: owner._id,
        isActive: true,
      });
    }

    for (const teamName of productSpec.teams) {
      const existingTeam = await findDepartmentByNameInsensitive(teamName, productDoc._id);
      if (!existingTeam) {
        await Department.create({
          name: teamName,
          product: productDoc._id,
          description: `Support team for ${teamName}`,
          keywords: [],
          isActive: true,
        });
      }
    }
  }

  catalogSynced = true;
};

export const resolveProductAndDepartment = async ({
  productName,
  departmentName,
  allowCreate = true,
}) => {
  await ensureAICatalogSynced(false);

  const owner = allowCreate ? await getCatalogOwner() : null;

  let productDoc = null;
  let departmentDoc = null;

  const canonicalProductName = canonicalizeProductName(productName);
  const normalizedDepartmentName = normalizeWhitespace(departmentName);

  if (canonicalProductName) {
    productDoc = await findProductByNameInsensitive(canonicalProductName);

    if (!productDoc && allowCreate && owner) {
      productDoc = await Product.create({
        name: canonicalProductName,
        description: "Auto-created from AI classification pipeline",
        createdBy: owner._id,
        isActive: true,
      });
    }
  }

  if (normalizedDepartmentName && productDoc) {
    departmentDoc = await findDepartmentByNameInsensitive(
      normalizedDepartmentName,
      productDoc._id
    );

    if (!departmentDoc && allowCreate) {
      departmentDoc = await Department.create({
        name: normalizedDepartmentName,
        product: productDoc._id,
        description: `Auto-created from AI classification pipeline for ${normalizedDepartmentName}`,
        keywords: [],
        isActive: true,
      });
      departmentDoc = await Department.findById(departmentDoc._id).populate(
        "product",
        "name"
      );
    }
  }

  if (!departmentDoc && normalizedDepartmentName) {
    departmentDoc = await findDepartmentByNameInsensitive(normalizedDepartmentName);
    if (departmentDoc && !productDoc) {
      productDoc = departmentDoc.product;
    }
  }

  if (!productDoc && canonicalProductName) {
    productDoc = await findProductByNameInsensitive(canonicalProductName);
  }

  return {
    productDoc,
    departmentDoc,
    productName: productDoc?.name || canonicalProductName || "",
    departmentName: departmentDoc?.name || normalizedDepartmentName || "",
  };
};

export const AI_CATALOG_SPECS = AI_CATALOG;
