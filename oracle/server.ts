import cors from 'cors';
import express from 'express';
require('dotenv').config();

const app = express();
app.use(cors());

app.use(express.json());


app.listen(3000, () => console.log(`🚀 Server ready at: http://localhost:3000`));
