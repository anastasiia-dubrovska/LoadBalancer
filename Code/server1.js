const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const request = require('request');
const Schema = mongoose.Schema;
const Request = require('request');
const session = require('express-session');
var https = require('https');

app.use(bodyParser.urlencoded({ extended: true }));
const urlencodedParser = bodyParser.urlencoded({ extended: false });

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


app.post("/solve", async function (request, response) {
    let taskId = request.query.taskId;
    solve(taskId);
});

async function solve(IDtask) {
    let result = 1;
    let progress_task = 0;
    console.log("taskId: ", IDtask);
    let resultData = await Task.findOne({ _id: IDtask.toString() });
    if (typeof resultData !== 'undefined') {
        console.log(" number:", resultData.number, " power:", resultData.power);
        for (let i = 0; i < Number(resultData.power); i++) {
            result = result * Number(resultData.number);
            progress_task = progress_task + 100 / Number(resultData.power);
            resultData.time = 2 * (Number(resultData.power) - i)
            resultData.progress = progress_task.toString();
            let ifExist = await Task.findOne({ _id: IDtask.toString() });
            if (!ifExist) break;
            if (i == Number(resultData.power) - 1) {
                resultData.progress = 100;
                progress_task = 100;
                resultData.result = result;
                await Task.updateOne({ _id: IDtask.toString() }, {
                    progress: progress_task,
                    result: result,
                    time: 0
                });
                await ServerNow.updateOne({ server_index: 0 }, {
                    progress: 0,
                    result: 0,
                    task_id: mongoose.Types.ObjectId('1111111111111111111111a1'),
                    number: 0,
                    power: 0
                }, { upsert: true, new: true });
            }

            else {
                await Task.updateOne({ _id: IDtask.toString() }, {
                    progress: progress_task
                });
                await ServerNow.updateOne({ server_index: 0 }, {
                    progress: progress_task,
                    result: result,
                    task_id: resultData._id,
                    number: resultData.number,
                    power: resultData.power,
                    time: resultData.time
                }, { upsert: true, new: true });
            }
            sleep(2000)
        }

    }

    Request.post({ url: 'http://127.0.0.1:8005/finishSolve?index=0' }, (err, res, body) => {
        if (err) return res.status(500).send({ message: err });
        if (res.body != "OK") {
            //console.log("res.body:",res.body,"----");
            let res_task_id = JSON.parse(res.body);
            res_task_id = res_task_id.taskId;
            //console.log("res_task_id1: ",res_task_id)
            solve(res_task_id);
        }
    });

}

app.listen(8001);


console.log("Server running at http://127.0.0.1:8001/");