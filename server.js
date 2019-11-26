const express = require('express');
const config = require('./config/local.json');

const app = express();
const port = config.port;
app.use(express.static('public'));

app.listen(port, () => console.log(`Example app listening on port http://127.0.0.1:${port}`));
