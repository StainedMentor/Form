const express = require('express')
const app = express()
const port = 3001

app.get("/api", (req, res) => {
  res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
