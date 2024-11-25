const express = require("express");
var fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
var path = require('path');
const Schema = mongoose.Schema;
const Request = require('request');
const session = require('express-session');
var https = require("https");




var httpsOptions = {
    key: fs.readFileSync("https/key.pem"),
    cert: fs.readFileSync("https/cert.pem")
}

var queueTasks = [];
var freeServers = [true, true, true];


app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));


app.use(bodyParser.urlencoded({ extended: true }));
const urlencodedParser = bodyParser.urlencoded({ extended: false });

mongoose.connect("mongodb://localhost:27017/DataBase", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});



const userScheme = new Schema({
    login: { type: String, unique: true },
    password: String
});
const taskScheme = new Schema({
    user_id: mongoose.Types.ObjectId,
    number: Number,
    power: Number,
    progress: { type: Number, default: 0 },
    result: { type: Number, default: 0 }
});

const User = mongoose.model("User", userScheme);
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

app.get('/', function (req, res) {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname + '/index.html'));
    } else {
        res.sendFile(path.join(__dirname + '/indexNoLogin.html'));
    }

});


app.post("/login", urlencodedParser, function (request, response) {
    if (!request.body) return response.sendStatus(400);
    let login = request.body.login;
    let password = request.body.password;
    if (login && password) {
        User.findOne({ login: request.body.login, password: request.body.password }, function (err, user) {
            if (err) throw err;
            if (user) {
                request.session.loggedin = true;
                request.session.login = login;
                response.redirect("/")
            }
            else {
                response.send('Incorrect Username and/or password');

            }
            response.end();
        });

    }
    else {
        response.send('Please enter Username and Password!');
        response.end();
    }
});

app.post("/signUp", urlencodedParser, function (request, response) {
    if (!request.body) return response.sendStatus(400);
    let login = request.body.login;
    let password = request.body.password;
    let confirm_password = request.body.confirm_password;
    if (password != confirm_password) {
        response.send('password!=confirm password');
    }
    else {
        let existsUser = false;
        User.findOne({ login: login }, function (err, user) {
            if (err) throw err;
            if (user) {
                existsUser = true;
                response.send('User with such a login already exists ');
            }
        });
        if (!existsUser) {
            const user = new User({
                login: login,
                password: password
            });
            user.save(function (err) {
                if (err) return response.send(err);
                console.log("signUp login:", login);
            });
            request.session.loggedin = true;
            request.session.login = login;
            response.redirect("/")
        }
    }
});


app.get('/login.h', function (req, res) {
    res.sendFile(path.join(__dirname + '/login.html'));
});
app.get('/panel', function (req, res) {
    res.sendFile(path.join(__dirname + '/panel.html'));
});
app.get('/signUp', function (req, res) {
    res.sendFile(path.join(__dirname + '/signUp.html'));
});

app.post("/delete", function (request, response) {
    let id_task = request.query.id_task;
    console.log("delete:", id_task);
    Task.deleteOne({ _id: id_task }, function (err) {
        if (err) return handleError(err);
    });
});

app.get("/exit", function (request, response) {
    request.session.login = undefined;
    request.session.loggedin = false;
    console.log("exit");
    response.redirect('https://127.0.0.1:8000/');

});


app.get("/tasks", urlencodedParser, async function (request, response) {
    if (!request.body) return response.sendStatus(400);
    let login = request.session.login;
    let u = await User.findOne({ login: login }, function (err, user) { 
    });
    let idUser = u._id;
    if (typeof login !== 'undefined' && login != false && idUser != 0) {
        Task.find({ user_id: idUser }, function (err, tasks) {
            var allTime = 0;
            for (let i = 0; i < tasks.length; i++)
            {
                if (tasks[i].progress != 0)
                {
                    allTime += tasks[i].time;
                    continue;
                }

                tasks[i].time = parseInt(allTime / 3 + (queueTasks.findIndex((x) => x._id === tasks[i]._id) / 3) * 2);
                console.log("time ", tasks[i].time);
                console.log("index ", queueTasks.findIndex((x) => x._id === tasks[i]._id));
            }

            return response.end(JSON.stringify(tasks));
        });
    }
    else {
        response.send("ErrLogin");
    }
});

app.get("/servers", urlencodedParser, async function (request, response) {
    console.log("get servers");
    if (!request.body) return response.sendStatus(400);
    ServerNow.find({}, function (err, servers) {
        return response.end(JSON.stringify(servers));
    });

});

app.post("/task", async function (request, response) {
    if (!request.body) return response.sendStatus(400);
    let login_user = request.session.login;
    console.log("--------login_user: ", login_user);
    var u = await User.findOne({ login: login_user });
    console.log("user:", u);
    let countTask = await Task.find({ user_id: (u._id).toString() });
    console.log("countTask: ", countTask);
    countTask = countTask.length;
    console.log("count: ", countTask);
    console.log("--------user._id: ", u._id);
    if (countTask < 10) {
        let task = new Task({
            user_id: u._id,
            number: Number(request.body.number),
            power: Number(request.body.power)
        });
        task.save(function (err) { if (err) return console.log(err); });
       

        if (freeServers[0] == true) {
            Request.post({ url: 'http://127.0.0.1:8001/solve?taskId=' + String(task._id) }, (err, res, body) => {
                if (err) return res.sendStatus(500).send({ message: err });
            });
            freeServers[0] = false;

        }
        else if (freeServers[1] == true) {
            Request.post({ url: 'http://127.0.0.1:8002/solve?taskId=' + String(task._id) }, (err, res, body) => {
                if (err) return res.sendStatus(500).send({ message: err });
            });
            freeServers[1] = false;

        }
        else if (freeServers[2] == true) {
            Request.post({ url: 'http://127.0.0.1:8003/solve?taskId=' + String(task._id) }, (err, res, body) => {
                if (err) return res.sendStatus(500).send({ message: err });
            });
            freeServers[2] = false;
        }
        else {
            queueTasks.push(task._id);
            console.log(queueTasks);
        }
    }

});
app.get("/task", function (request, response) {
    let index_server = request.query.index;
    if (queueTasks.length > 0) {
        let id_task = queueTasks.shift();
        freeServers[Number(index_server)] = false;
        response.send(id_task);
    }
    else {
        freeServers[Number(index_server)] = true;
        response.status(500);
    }
});

app.post("/finishSolve", function (request, response) {
    let index_server = request.query.index;
    freeServers[Number(index_server)] = true;
    console.log("------finishSolve-----", index_server);

    if (queueTasks.length > 0) {
        let id_task = queueTasks.shift();
        freeServers[Number(index_server)] = false;
        console.log("id_task: ", id_task);
        response.json({ taskId: id_task });
    }
    else {
        response.send(200);
    }
});

app.listen(8005);
https.createServer(httpsOptions, app).listen(8000);

console.log("Server running at https://127.0.0.1:8000/");

