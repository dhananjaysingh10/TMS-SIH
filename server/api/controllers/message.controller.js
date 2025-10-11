import Ticket from "../models/ticket.model.js";
import { uploadToAppwrite } from "../services/appwrite.service.js";

export const getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ ticketId })
      .select("chat")
      .populate("chat.user", "name email profilePicture");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json(ticket.chat);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId || "68de96b00ca9e85f42aeaa86";

    let uploadedFile = null;
    if (req.files) {
      if (Array.isArray(req.files.file) && req.files.file.length > 0) {
        uploadedFile = req.files.file[0];
      } else if (Array.isArray(req.files.audio) && req.files.audio.length > 0) {
        uploadedFile = req.files.audio[0];
      }
    }

    console.log('Received request:', {
      ticketId,
      content,
      hasFile: !!uploadedFile,
      reqFiles: req.files,
      fileDetails: uploadedFile ? {
        fieldname: uploadedFile.fieldname,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size
      } : null
    });

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    let attachmentUrl = "";
    let mimeType = "";

    // Handle file upload to Appwrite
    if (uploadedFile) {
      try {
        const fileBuffer = uploadedFile.buffer;
        const fileName = uploadedFile.originalname;
        const fileMimeType = uploadedFile.mimetype;

        console.log('Processing file:', { 
          fileName, 
          fileMimeType, 
          bufferSize: fileBuffer.length,
          hasBuffer: !!fileBuffer 
        });

        if (!fileBuffer || fileBuffer.length === 0) {
          throw new Error('File buffer is empty');
        }

        // Create a File object from buffer
        const blob = new Blob([fileBuffer], { type: fileMimeType });
        const file = new File([blob], fileName, { type: fileMimeType });

        console.log('File object created:', {
          name: file.name,
          size: file.size,
          type: file.type
        });

        // Upload to Appwrite
        const uploadResult = await uploadToAppwrite(file, uploadedFile.fieldname);
        
        if (!uploadResult || !uploadResult.fileUrl) {
          throw new Error('Upload result invalid - no file URL returned');
        }
        
        attachmentUrl = uploadResult.fileUrl;
        mimeType = uploadResult.mimeType;

        console.log('✅ File uploaded successfully:', {
          fileUrl: attachmentUrl,
          mimeType: mimeType,
          fileId: uploadResult.fileId
        });
      } catch (uploadError) {
        console.error('❌ Upload error:', uploadError);
        console.error('Upload error stack:', uploadError.stack);
        return res.status(500).json({ 
          message: "Failed to upload file: " + uploadError.message 
        });
      }
    } else {
      console.log('No file to upload - text-only message');
    }

    const message = {
      user: userId,
      content: content || "",
      attachment: attachmentUrl || "",
      mimeType: mimeType || "",
      createdAt: new Date(),
    };

    console.log('Creating message:', message);

    ticket.chat.push(message);
    await ticket.save();

    console.log('Message saved to ticket');

    // Populate user info for socket emission
    const populatedTicket = await Ticket.findOne({ ticketId })
      .select("chat")
      .populate("chat.user", "name email profilePicture");

    const lastMessage = populatedTicket.chat[populatedTicket.chat.length - 1];

    req.io.to(ticketId).emit("newMessage", {
      ticketId,
      message: lastMessage,
    });

    res.status(201).json(lastMessage);
  } catch (error) {
    console.error("❌ Send message error:", error);
    res.status(500).json({ message: error.message });
  }
};