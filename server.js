const express = require("express");
const app = express();
const port = 8000;
const path = require("path");

app.use(express.static("public"));
app.use("/scripts", express.static(path.join(__dirname, "node_modules")));

app.get("/week2", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/Week2/week2.html"));
});

app.get("/week6", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/Week6/week6.html"));
});

app.get("/hw1", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/HW/HW1/hw1.html"));
});

app.get("/hw2", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/HW/HW2/hw2.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.listen(port, () => {
  console.log("Server is running!");
});
