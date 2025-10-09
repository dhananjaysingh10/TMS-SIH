import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer receiving file:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    cb(null, true);
  }
});

// Single export that handles both 'file' and 'audio'
export const handleUpload = (req, res, next) => {
  const run = upload.fields([
    { name: "file", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ]);

  run(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ message: "File upload failed: " + err.message });
    }

    console.log("Files after multer:", {
      hasFiles: !!req.files,
      fileKeys: req.files ? Object.keys(req.files) : [],
    });

    next();
  });
};
