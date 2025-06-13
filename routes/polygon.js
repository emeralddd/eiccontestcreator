const express = require('express');
const { encode } = require('urlencode');
const { requestAPI } = require('../utils');
const problems = require('../models/problems');

const router = express.Router();

function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Some system encode vietnamese combining accent as individual utf-8 characters
    // Một vài bộ encode coi các dấu mũ, dấu chữ như một kí tự riêng biệt nên thêm hai dòng này
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣  huyền, sắc, ngã, hỏi, nặng
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
    // Remove extra spaces
    // Bỏ các khoảng trắng liền nhau
    str = str.replace(/ + /g, " ");
    str = str.trim();
    // Remove punctuations
    // Bỏ dấu câu, kí tự đặc biệt
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g, " ");
    return str;
}

router.get('/listProblemsFromPolygon', async (req, res) => {
    // console.log('abc');
    try {
        const req1 = await requestAPI('problems.list');
        // console.log(req1);
        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong tim thay'
            });
        }

        // console.log(req1.result);

        res.json({
            success: true,
            payload: req1.result
        });
    } catch (error) {
        // console.log(error);
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.post('/create', async (req, res) => {
    try {
        const { name } = req.body;

        const req1 = await requestAPI('problem.create', {
            name
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong tao duoc'
            });
        }

        const newProblem = new problems({
            problemId: req1.result.id
        });

        await newProblem.save();

        await requestAPI('problem.setChecker', {
            problemId: req1.result.id,
            checker: 'std::wcmp.cpp'
        });

        await requestAPI('problem.updateInfo', {
            problemId: req1.result.id,
            inputFile: 'stdin',
            outputFile: 'stdout',
            interactive: false,
            timeLimit: 1000,
            memoryLimit: 512,
        });

        req1.result.info = {
            timeLimit: 1000,
            inputFile: "stdin",
            outputFile: "stdout",
            interactive: false,
            memoryLimit: 512
        };

        req1.result.validator = '';
        req1.result.checker = 'std::wcmp.cpp';
        req1.result.lang = 'english';
        req1.result.statements = {
            encoding: 'UTF-8',
            name: '',
            legend: '',
            input: '',
            output: '',
            scoring: '',
            notes: '',
            tutorial: ''
        };

        res.json({
            success: true,
            payload: req1.result
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.get('/getProblem/:problemId', async (req, res) => {
    try {
        const id = req.params.problemId;

        const reqNameArray = ['info', 'checker', 'validator', 'viewGeneralTutorial'];

        if (!Number(id)) {
            return res.status(201).json({
                success: false,
                message: 'Khong phai ID'
            });
        }

        const problemData = {};

        for (const r of reqNameArray) {
            const req1 = await requestAPI('problem.' + r, {
                problemId: id
            });

            if (!req1 || req1.status === 'FAILED') {
                return res.status(201).json({
                    success: false,
                    message: req1 ? req1.comment : 'Khong tao duoc'
                });
            }

            problemData[r] = req1.result;
        }

        const findInDrive = await problems.findOne({ problemId: id });

        if (!findInDrive) {
            const findInPolygon = await requestAPI('problem.statements', {
                problemId: id
            });

            if (!findInPolygon || findInPolygon.status === 'FAILED') {
                return res.status(201).json({
                    success: false,
                    message: findInPolygon ? findInPolygon.comment : 'Khong tim duoc'
                });
            }

            // console.log(findInPolygon);

            problemData.statements = {
                english: findInPolygon.result['english'] || findInPolygon.result['vietnamese']
            }
        } else {
            problemData.statements = {
                english: findInDrive.statements
            }
        }


        // console.log(problemData);

        res.json({
            success: true,
            payload: problemData
        });

    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.put('/updateInfo', async (req, res) => {
    try {
        const { problemId, info } = req.body;
        const req1 = await requestAPI('problem.updateInfo', {
            problemId,
            ...info
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong cap nhat duoc'
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.post('/commitChanges', async (req, res) => {
    try {
        console.log('commit');
        const { problemId } = req.body;
        const req1 = await requestAPI('problem.commitChanges', {
            problemId,
            message: `Committed`
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong commit duoc'
            });
        }

        console.log('committed');

        res.json({
            success: true
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.put('/saveStatement', async (req, res) => {
    try {
        const { problemId, lang, statements } = req.body;

        // statements.input = encode(statements.input);

        // console.log(statements.input);

        const req1 = await problems.findOneAndUpdate({
            problemId
        }, {
            statements
        }, {
            upsert: true, new: true, setDefaultsOnInsert: true
        });

        const req2 = await requestAPI('problem.saveStatement', {
            problemId,
            lang,
            name: statements.name
        });

        if (!req1 || !req2 || req2.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req2 ? req2.comment : 'Khong luu duoc'
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.put('/setChecker');

router.put('/saveSolution', async (req, res) => {
    try {
        const { problemId, solution } = req.body;

        const req1 = await requestAPI('problem.saveSolution', {
            problemId,
            ...solution
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong luu duoc sol'
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.put('/saveTest', async (req, res) => {
    try {
        const { problemId, test } = req.body;

        const req2 = await requestAPI('problem.saveTest', {
            problemId,
            testset: 'tests',
            ...test
        });

        if (!req2 || req2.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req2 ? req2.comment : 'Khong luu duoc test'
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.get('/testAnswer/:problemId/:index', async (req, res) => {
    try {
        const id = req.params.problemId;
        const testIndex = req.params.index;

        // console.log(testIndex);

        const req1 = await requestAPI('problem.testAnswer', {
            problemId: id,
            testset: 'tests',
            testIndex
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong tao duoc test'
            });
        }

        res.json({
            success: true,
            payload: req1
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }

});

router.get('/getExampleTests/:problemId', async (req, res) => {
    try {
        const id = req.params.problemId;

        const req1 = await requestAPI('problem.tests', {
            problemId: id,
            testset: 'tests',
            noInputs: true
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong kiem duoc test'
            });
        }

        const example = req1.result.filter(x => x.useInStatements);

        for (let i = 0; i < example.length; i++) {
            const req1 = await requestAPI('problem.testInput', {
                problemId: id,
                testset: 'tests',
                testIndex: example[i].index
            });

            if (!req1 || req1.status === 'FAILED') {
                return res.status(201).json({
                    success: false,
                    message: req1 ? req1.comment : 'Khong kiem duoc test'
                });
            }

            example[i].input = req1;
        }

        res.json({
            success: true,
            payload: example
        });
    } catch (error) {
        console.log('get example tests');
        console.log(error.response);
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.get('/getExampleTestResources/:problemId', async (req, res) => {
    try {
        const id = req.params.problemId;

        const req1 = await requestAPI('problem.tests', {
            problemId: id,
            testset: 'tests',
            noInputs: true
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong kiem duoc test'
            });
        }

        const example = req1.result.filter(x => x.useInStatements);

        for (let i = 0; i < example.length; i++) {
            const req1 = await requestAPI('problem.testInput', {
                problemId: id,
                testset: 'tests',
                testIndex: example[i].index
            });

            if (!req1 || req1.status === 'FAILED') {
                return res.status(201).json({
                    success: false,
                    message: req1 ? req1.comment : 'Khong kiem duoc input'
                });
            }

            const req2 = await requestAPI('problem.testAnswer', {
                problemId: id,
                testset: 'tests',
                testIndex: example[i].index
            });

            if (!req2 || req2.status === 'FAILED') {
                return res.status(201).json({
                    success: false,
                    message: req2 ? req2.comment : 'Khong kiem duoc output'
                });
            }

            example[i].input = req1;
            example[i].output = req2;
        }

        // console.log(example);

        res.json({
            success: true,
            payload: example
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.get('/getSolutions/:problemId', async (req, res) => {
    try {
        const id = req.params.problemId;

        const req1 = await requestAPI('problem.solutions', {
            problemId: id,
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong kiem duoc sol'
            });
        }

        const solutions = [];

        for (const i of req1.result) {
            const req = await requestAPI('problem.viewSolution', {
                problemId: id,
                name: i.name
            });

            if (!req || req.status === 'FAILED') {
                return res.status(201).json({
                    success: false,
                    message: req ? req.comment : 'Khong kiem duoc SOL'
                });
            }

            solutions.push({
                ...i,
                file: req
            });
        }

        res.json({
            success: true,
            payload: solutions
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

router.post('/buildPackage', async (req, res) => {
    try {
        const { problemId } = req.body;
        const req1 = await requestAPI('problem.buildPackage', {
            problemId,
            full: false,
            verify: true
        });

        if (!req1 || req1.status === 'FAILED') {
            return res.status(201).json({
                success: false,
                message: req1 ? req1.comment : 'Khong build duoc'
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        if (error.response && error.response.data) {
            res.status(201).json({
                success: false,
                message: error.response.data.comment
            });
        } else {
            console.error(error.response.data);
            res.status(500).json({
                success: false,
                message: '500'
            });
        }
    }
});

module.exports = router;