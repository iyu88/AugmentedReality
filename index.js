const express = require("express");
const app = express();
const path = require("path");
const router = express.Router();

router.get("/week2", (req, res) => {
  res.sendFile(path.join(__dirname + "/Week2/week2.html"));
});

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.use("/", router);

app.listen(8000, () => {
  console.log("Server is running!");
});
