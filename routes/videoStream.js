'use strict';

const express = require('express');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// this route gets any video that has been posted
// still need to implement the db filename
// this will only be caled when populating the party card
router.get('/:name', (req, res, next) => {
    const path = 'videoTest/' + req.params.name + '.mp4';
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.headers.range;


    if(range){
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] 
            ? parseInt(parts[1], 10) 
            : fileSize - 1;

        if(start >= fileSize){
            res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
            return;
        }

        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(path, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4'
        }

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4'
        };

        res.writeHead(200, head);
        fs.createReadStream(path).pipe(res);
    }
});

module.exports = router;