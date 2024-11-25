const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const request = require('request');
const Schema = mongoose.Schema;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/DataBase", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const taskScheme = new Schema({
    _id: mongoose.Types.ObjectId,
    user_id: Schema.Types.ObjectId,
    number: Number,
    power: Number,
    progress: { type: Number, default: 0 },
    result: { type: Number, default: 0 },
    time: { type: Number, default: 0 }
});

const Task = mongoose.model("Task", taskScheme);

const serversSheme = new Schema({
    server_index: Number,
    task_id: Schema.Types.ObjectId,
    number: Number,
    power: Number,
    progress: { type: Number, default: 0 },
    result: { type: Number, default: 0 }
});

const ServerNow = mongoose.model("Server", serversSheme);


function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}


async function solve(taskId, serverIndex) {
    let result = 1;
    let progress_task = 0;

    const task = await Task.findOne({ _id: taskId });
    if (task) {
        for (let i = 0; i < task.power; i++) {
            result *= task.number;
            progress_task += 100 / task.power;

            task.progress = progress_task;
            task.time = 2 * (task.power - i);

            if (i === task.power - 1) {
                task.result = result;
                task.progress = 100;
                task.time = 0;
            }

            await Task.updateOne({ _id: taskId }, task);
            await ServerNow.updateOne(
                { server_index: serverIndex },
                {
                    progress: task.progress,
                    result: task.result,
                    task_id: task._id,
                    number: task.number,
                    power: task.power,
                    time: task.time
                },
                { upsert: true }
            );

            sleep(2000);
        }
    }

    request.post(`http://127.0.0.1:8005/finishSolve?index=${serverIndex}`, (err, res, body) => {
        if (err) {
            console.error("Request error:", err);
        } else if (body !== "OK") {
            const newTaskId = JSON.parse(body).taskId;
            solve(newTaskId, serverIndex);
        }
    });
}


app.post("/solve", async (req, res) => {
    const taskId = req.query.taskId;
    const serverIndex = req.query.serverIndex || 0;
    solve(taskId, serverIndex);
    res.send("Task received");
});


const port = process.argv[2] || 8000; 
app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
});
