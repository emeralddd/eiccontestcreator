import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiURL } from '../utils/VariableName';
import Select, { createFilter } from 'react-select';
import { parse, HtmlGenerator } from 'latex.js';

const Homepage = () => {
    const [isOpenAddProblem, setOpenAddProblem] = useState(false);
    const [isOpenNewProblem, setOpenNewProblem] = useState(false);

    const [problemList, setProblemList] = useState([]);

    const [problem, setProblem] = useState(null);
    const [newProblemName, setNewProblemName] = useState('');

    const [openPreview, setOpenPreview] = useState(false);

    const [working, setWorking] = useState(0);
    const [tabs, setTabs] = useState([{
        id: 'Welcome emerald',
        name: 'Hello!',
        hello: 1,
        inContest: false
    }]);

    const [message, setMessage] = useState({
        status: 0,
        message: 'Hii!',
        visible: false
    });

    const [latexHtml, setLatex] = useState('');

    const [whichPage, setPage] = useState(true);

    const [contestData, setContestData] = useState({
        class: 'EIC4',
        name: 'Buổi 15 - Luyện tập',
        date: '13/06/2025'
    });

    const onContestChange = (event) => {
        const newData = { ...contestData };
        newData[event.target.name] = event.target.value
        setContestData(newData);
    }

    useEffect(() => {
        const waitTwoSeconds = setTimeout(() => setLatex(visionsOfGideon()), 1000);
        return () => clearTimeout(waitTwoSeconds);
    }, [tabs, working]);

    const newTab = (data) => {
        const newTabObj = {
            hello: 0,
            edit: false,
            inContest: true,
            ...data
        };

        setTabs([...tabs, newTabObj]);
        setWorking(tabs.length);
    }

    const processing = () => {
        setMessage({
            status: 1,
            message: 'Processing',
            visible: true
        });
    }

    const closeMessage = () => {
        setMessage({
            status: 0,
            message: 'Success',
            visible: true
        });

        setTimeout(() => {
            setMessage({
                status: 0,
                message: 'Finish',
                visible: false
            });
        }, 2000);
    }

    const showError = (msg) => {
        setMessage({
            status: 2,
            message: msg,
            visible: true
        });

        setTimeout(() => {
            setMessage({
                status: 0,
                message: 'Finish',
                visible: false
            });
        }, 2000);
    }

    const getProblemList = async () => {
        processing();

        const res = await axios.get(`${apiURL}/listProblemsFromPolygon`);

        console.log(res.data);

        if (!res.data.success) {

            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        const arr = res.data.payload;
        const opt = [];
        for (const i of arr) {
            opt.push({ label: i.name, value: i });
        }

        setProblemList(opt);

        closeMessage();
    }

    const addNewProblem = async () => {
        processing();

        const res = await axios.post(`${apiURL}/create`, {
            name: newProblemName
        });

        if (!res.data.success) {
            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        newTab(res.data.payload);
        setOpenNewProblem(false);
        setPage(true);
        closeMessage();
    }

    const reloadProblemList = async () => {
        await getProblemList();
    }

    const openAddProblem = async () => {
        if (problemList.length === 0) await getProblemList();
        setProblem(null);
        setOpenAddProblem(true);
    }

    const openNewProblem = () => {
        setNewProblemName('');
        setOpenNewProblem(true);
    }

    const onChangeStatement = (event) => {
        const tmp = [...tabs];
        tmp[working].statements[event.target.name] = event.target.value;
        setTabs(tmp);
    }

    const setProblemInContest = (id) => {
        const tmp = [...tabs];
        tmp[id].inContest = !tmp[id].inContest;
        setTabs(tmp);
    }

    const changePosition = (id, offset) => {
        const tmp = [...tabs];
        if (id + offset === 0 || id + offset === tabs.length) return;
        if (id === 0) return;
        const tempElement = tmp[id];
        tmp[id] = tmp[id + offset];
        tmp[id + offset] = tempElement;

        if (working === id) {
            setWorking(working + offset);
        } else if (working === id + offset) {
            setWorking(working - offset);
        }

        setTabs(tmp);
    }

    const onChangeInfo = (event) => {
        const tmp = [...tabs];
        tmp[working].info[event.target.name] = event.target.value;
        setTabs(tmp);
    }

    const addProblemFromPolygon = async () => {
        processing();
        const res = await axios.get(`${apiURL}/getProblem/${problem.value.id}`);

        if (!res.data.success) {
            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        if (res.data.payload.statements.english || res.data.payload.statements.vietnamese) {
            res.data.payload.lang = res.data.payload.statements.english ? 'english' : 'vietnamese';
            res.data.payload.statements = res.data.payload.statements[res.data.payload.lang];
            delete res.data.payload.statements[res.data.payload.lang];
        } else {
            res.data.payload.lang = 'english';
            res.data.payload.statements = {
                encoding: 'UTF-8',
                name: '',
                legend: '',
                input: '',
                output: '',
                scoring: '',
                notes: '',
                tutorial: ''
            }
        }

        newTab({ ...problem.value, ...res.data.payload, solution: false });
        setOpenAddProblem(false);
        setPage(true);
        closeMessage();
    }

    const switchToTest = async () => {
        if (!tabs[working].solution && whichPage) {
            processing();
            const res = await axios.get(`${apiURL}/getExampleTests/${tabs[working].id}`);

            if (!res.data.success) {
                console.log(res.data.message);
                showError(res.data.message);
                return;
            }

            const res1 = await axios.get(`${apiURL}/getSolutions/${tabs[working].id}`);

            if (!res1.data.success) {
                console.log(res1.data.message);
                showError(res1.data.message);
                return;
            }

            const t = [...tabs];
            t[working].solution = res1.data.payload.length > 0 ? res1.data.payload[0] : {
                name: 'sol.cpp',
                file: '',
                tag: 'MA'
            };
            delete t[working].solution.modificationTimeSeconds;
            delete t[working].solution.length;
            delete t[working].solution.sourceType;
            t[working].tests = res.data.payload;

            setTabs(t);
            closeMessage();
        }
        setPage(!whichPage);
    }

    const onChangeProblem = async (event) => {
        setNewProblemName(event.target.value);
    }

    const saveInfo = async () => {
        processing();
        const res = await axios.put(`${apiURL}/updateInfo`, {
            problemId: tabs[working].id,
            info: tabs[working].info
        });

        if (!res.data.success) {
            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        closeMessage();
    }

    const saveStatement = async () => {
        processing();
        const res = await axios.put(`${apiURL}/saveStatement`, {
            problemId: tabs[working].id,
            lang: tabs[working].lang,
            statements: tabs[working].statements
        });

        if (!res.data.success) {

            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        closeMessage();
    }

    const commit = async () => {
        processing();
        const res = await axios.post(`${apiURL}/commitChanges`, {
            problemId: tabs[working].id
        });

        if (!res.data.success) {

            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        closeMessage();
    }

    const buildPackage = async () => {
        processing();
        const res = await axios.post(`${apiURL}/buildPackage`, {
            problemId: tabs[working].id
        });

        if (!res.data.success) {

            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        closeMessage();
    }

    const saveSolution = async () => {
        processing();
        const res = await axios.put(`${apiURL}/saveSolution`, {
            problemId: tabs[working].id,
            solution: tabs[working].solution
        });

        if (!res.data.success) {
            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        closeMessage();
    }

    const onChangeSolution = (event) => {
        const tmp = [...tabs];
        tmp[working].solution.file = event.target.value;
        setTabs(tmp);
    }

    const onChangeTest = (event, i) => {
        const tmp = [...tabs];
        tmp[working].tests[i].input = event.target.value;
        setTabs(tmp);
    }

    const saveTest = async (i) => {
        processing();
        const res = await axios.put(`${apiURL}/saveTest`, {
            problemId: tabs[working].id,
            test: {
                testIndex: tabs[working].tests[i].index,
                testInput: tabs[working].tests[i].input,
                useInStatements: true
            }
        });

        if (!res.data.success) {
            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        closeMessage();
    }

    const previewTest = async (i) => {
        processing();
        const res = await axios.get(`${apiURL}/testAnswer/${tabs[working].id}/${tabs[working].tests[i].index}`);

        if (!res.data.success) {
            console.log(res.data.message);
            showError(res.data.message);
            return;
        }

        const t = [...tabs];
        t[working].tests[i].output = res.data.payload;

        setTabs(t);
        closeMessage();
    }

    const newTest = (event) => {
        const t = [...tabs];
        t[working].tests = [...t[working].tests, {
            index: t[working].tests.length + 1,
            input: '',
            useInStatements: true
        }];
        setTabs(t);
    }

    const latexGen = (str) => {
        try {
            const generator = new HtmlGenerator({ hyphenate: true });
            return parse(str, { generator: generator }).htmlDocument('https://latex.js.org/').documentElement.outerHTML.replace("56.162", "80").replaceAll("21.919%", "auto");
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    const visionsOfGideon = () => {
        // console.log(`${__filename}`);
        const str = `
        \\documentclass[13pt]{article}

        \\begin{document} 

    ${working === 0 ? `This is Polygon Create Site! Listening to TTPD and using \\LaTeX` : `
        {\\Large \\textbf{${tabs[working].statements.name}}}

        \\\\

        Time limit: ${tabs[working].info.timeLimit} ms

        Mem limit: ${tabs[working].info.memoryLimit} MB

        Input: ${tabs[working].info.inputFile}

        Output: ${tabs[working].info.outputFile}

        \\\\

        ${tabs[working].statements.legend}

        \\\\

        \\textbf{Input}

        ${tabs[working].statements.input}

        \\textbf{Output}

        ${tabs[working].statements.output}

        \\textbf{Scoring}

        ${tabs[working].statements.scoring ? tabs[working].statements.scoring.split('\n').map((v, i) => `Subtask ${i + 1} (${v.split(';')[0]}\\%): ${v.split(';').slice(1).join(';')}`).join("\n\n") : ""}

        \\textbf{Note}

        ${tabs[working].statements.notes}

        \\textbf{Tutorial}

        ${tabs[working].statements.tutorial}
        `}

    \\end{document}`;

        return latexGen(str);
    }

    const printToTex = async () => {
        // event.preventDefault();
        if (tabs.length <= 1) {
            showError("Jz ma");
            return;
        }

        const tests = [];

        for (const tab of tabs) {
            if (tab.hello) continue;
            if (!tab.inContest) continue;

            const tmp = await axios.get(`${apiURL}/getExampleTestResources/${tab.id}`);

            if (!tmp.data.success || !tmp.data.payload || tmp.data.payload.length === 0) {
                console.log(tmp.data.message);
                tests.push([{ input: 'abc', output: 'cde' }]);
            } else {
                const arr = [];
                for (const i of tmp.data.payload) {
                    i.input = String(i.input);
                    i.output = String(i.output);

                    if (i.input[i.input.length - 1] === '\n') i.input.slice(0, -2);
                    if (i.output[i.output.length - 1] === '\n') i.output.slice(0, -2);
                    arr.push(i);
                }
                tests.push(arr);
            }
        }


        let res = `
        \\documentclass[a4paper]{article}
        \\usepackage[left=0.85in,
                    right=0.85in,
                    top=0.5in,
                    bottom=0.75in,
        includehead,nomarginpar,]{geometry}
        \\usepackage{parskip}
        \\usepackage{fontspec}
        \\usepackage{fancyhdr}
        \\usepackage{lastpage}
        \\usepackage{titlesec}
        \\usepackage{array}
        \\usepackage{tocloft}
        \\usepackage{tabularray}
        \\usepackage{sectsty}
        \\usepackage{graphicx}

        \\setsansfont{LexendDeca}[
            Path=./LexendDecaFont/,
            Extension = .ttf,
            UprightFont=*-Regular,
            BoldFont=*-Bold
            ]

        \\setmonofont[Scale=0.88]{NotoSansMono}[
            Path=./NotoSansMonoFont/,
            Extension = .ttf,
            UprightFont=*-Regular,
            BoldFont=*-Bold
            ]

        \\pagestyle{fancy}
        \\renewcommand{\\headrulewidth}{1pt}
        \\renewcommand{\\footrulewidth}{1pt}

        \\titleformat{\\section}
        {\\LARGE\\bfseries}{}{0pt}{}

        \\titleformat{\\subsection}
        {\\Large\\bfseries}{}{}{}

        \\fancyhf{}
        \\fancyhead[L]{\\sffamily \\normalsize \\textbf{EIC3}}
        \\fancyhead[R]{\\sffamily \\normalsize 11/5/2025}
        \\fancyfoot[C]{\\sffamily \\normalsize\\ Trang \\textbf{\\thepage} trên \\textbf{\\pageref{LastPage}}}
        \\sectionfont{\\MakeUppercase}

        \\begin{document}

        \\vspace*{2cm}

        {
        \\centering
        {\\LARGE \\bfseries EIC3}

        {\\Large 
        \\textbf{Buổi 4 - Ôn tập Hash}

        %\\textit{Thời gian làm bài: 120 phút}%

        11/05/2025

        }

        }

        \\vspace{2cm}


        \\renewcommand\\cfttoctitlefont{\\bfseries\\LARGE}
        \\renewcommand\\cftsecfont{\\Large}
        \\renewcommand\\cftsecpagefont{\\Large}
        \\setcounter{secnumdepth}{0}
        \\setcounter{tocdepth}{1}
        \\renewcommand{\\cftsecleader}{\\cftdotfill{\\cftdotsep}}
        \\setlength{\\cftbeforesecskip}{20pt}
        \\renewcommand\\contentsname{\\hfill TỔNG QUAN\\hfill}
        \\tableofcontents

        `;

        const notContest = 1;

        for (let i = 1; i < tabs.length; i++) {
            res += `
            \\newpage

        \\large
        \\section{${String.fromCharCode(i + 64)}. ${tabs[i].statements.name}}

        ${notContest ? `` : `\\vspace{10pt}
        {
        \\hspace{10pt}
        \\renewcommand{\\arraystretch}{1.25}
        \\begin{tabular}{ l l }
            Thời gian: & ${tabs[i].info.timeLimit} mili giây \\\\ 
            Bộ nhớ: & ${tabs[i].info.memoryLimit} MB \\\\  
        \\end{tabular}
        }
        \\vspace{15pt}`}


        % Legend
        ${tabs[i].statements.legend}

        % Input
        \\subsection{Dữ liệu}
        ${tabs[i].statements.input}

        % Output
        \\subsection{Kết quả}
        ${tabs[i].statements.output}

        % Scoring 
        \\subsection{Tính điểm}
        \\renewcommand{\\arraystretch}{1.4}
        \\setlength{\\tabcolsep}{10pt}
        \\begin{tabular}{ c | c | l }
            \\textbf{Thứ tự} & \\textbf{Tỉ lệ} & \\textbf{Ràng buộc} \\\\ 
            ${tabs[i].statements.scoring ? tabs[i].statements.scoring.split('\n').map((v, i) => `\\hline \n ${i + 1} & ${v.split(';')[0]}\\% & ${v.split(';').slice(1).join(';')} \\\\`).join("") : `\\hline
            1 & 100\\% & Không có giới hạn gì thêm. \\\\`}
        \\end{tabular}

        % Examples
        \\subsection{Ví dụ}
        \\renewcommand{\\arraystretch}{1.4}
        \\setlength{\\tabcolsep}{10pt}

        \\ttfamily
        \\begin{tblr}{X[1,l]|X[1,l]}
            \\textrm{\\textbf{${tabs[i].info.inputFile}}} & \\textrm{\\textbf{${tabs[i].info.outputFile}}} \\\\ 
            ${tests[i - 1].map(x => `\n \\hline \n {${x.input.replaceAll('\r\n', '\\\\')}} & {${x.output.replaceAll('\r\n', '\\\\')}} \\\\`).join('')}
        \\end{tblr}
        \\rmfamily

        % Explanation
        ${tabs[i].statements.notes && tabs[i].statements.notes.length > 0 ? `\\subsection{Giải thích}
        ${tabs[i].statements.notes}` : ``}
            `;
        }

        res += `
        \\end{document}
        `;

        var data = new Blob([res], { type: 'text/csv' });
        var csvURL = window.URL.createObjectURL(data);
        const tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', 'latex.txt');
        tempLink.click();
    }

    return (
        <>
            <div className={`${message.visible ? `` : `hidden`} text-center z-20 fixed right-20 bottom-10 text-white`}>
                <div className={`${message.status === 0 ? 'bg-green-700' : message.status === 1 ? 'bg-yellow-700' : 'bg-red-700'} py-2 px-10`}>
                    {message.message}
                </div>
            </div>

            <div className={`${isOpenAddProblem ? `` : `hidden`} text-center z-10 fixed left-1/4 top-1/3 w-1/2 text-white`}>
                <div className='bg-blue-950 py-2 px-10 text-xl font-bold'>
                    Add problem from Polygon
                </div>
                <div className='bg-neutral-900 py-3 px-5'>
                    <div className='my-2'>
                        Choose one
                    </div>

                    <Select placeholder='Chọn đi nhìn gì' options={problemList} filterOption={createFilter({ ignoreAccents: false })} onChange={(val) => setProblem(val)} value={problem} classNames={{
                        container: () => 'text-neutral-900 font-bold'
                    }} />

                    <div className='flex flex-row-reverse gap-3 mt-3 mx-5'>
                        <div className='hover:bg-blue-600 bg-blue-700 p-2' onClick={addProblemFromPolygon}>
                            Submit
                        </div>
                        <div className='hover:bg-green-600 bg-green-700 p-2' onClick={reloadProblemList}>
                            Reload
                        </div>
                        <div className='hover:bg-neutral-600 bg-neutral-700 p-2' onClick={() => setOpenAddProblem(false)}>
                            Cancel
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${isOpenNewProblem ? `` : `hidden`} text-center z-10 fixed left-1/4 top-1/3 w-1/2 text-white`}>
                <div className='bg-blue-950 py-2 px-10 text-xl font-bold'>
                    New problem
                </div>
                <div className='bg-neutral-900 py-3 px-5'>
                    <div className='my-2'>
                        Pick a name
                    </div>

                    <input type='text' value={newProblemName} className='bg-neutral-700 p-2 w-80' onChange={onChangeProblem} />

                    <div className='flex flex-row-reverse gap-3 mt-3 mx-5'>
                        <div className='hover:bg-blue-600 bg-blue-700 p-2' onClick={addNewProblem}>
                            Create
                        </div>
                        <div className='hover:bg-neutral-600 bg-neutral-700 p-2' onClick={() => setOpenNewProblem(false)}>
                            Cancel
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex h-screen text-white">
                <div className="basis-2/12 bg-neutral-900 overflow-y-auto">
                    <div className="p-2 font-bold">
                        Working Tabs ({tabs.length})
                    </div>
                    <div className="bg-blue-900 hover:bg-blue-700 p-2" onClick={openAddProblem}>
                        Add Problem
                    </div>
                    <div className="bg-green-900 hover:bg-green-700 p-2" onClick={openNewProblem}>
                        New Problem
                    </div>
                    <div className="bg-orange-900 hover:bg-orange-700 p-2" onClick={printToTex}>
                        Print to Tex
                    </div>
                    <div className='overflow-y-auto'>
                        {
                            tabs.map((a, i) => (
                                <div className='flex'>
                                    <div className='flex flex-col w-6 text-center'>
                                        <div className='basis-1/2 bg-neutral-800 hover:bg-neutral-600 cursor-pointer' onClick={() => changePosition(i, -1)}>
                                            ▲
                                        </div>
                                        <div className='basis-1/2 bg-neutral-800 hover:bg-neutral-600 cursor-pointer' onClick={() => changePosition(i, 1)}>
                                            ▼
                                        </div>
                                    </div>
                                    <div className={`${tabs[i].inContest ? `bg-green-500` : `bg-slate-700`} w-3 cursor-pointer`} onClick={() => setProblemInContest(i)}>
                                    </div>
                                    <div className={`p-2 flex-1 ${i === working ? `bg-neutral-800 hover:bg-neutral-600` : `hover:bg-neutral-700`}`} onClick={() => { setWorking(i); setPage(true); }}>
                                        <div className={`${a.edit ? ` italic` : ``}`}>
                                            {a.name} {a.edit ? '*' : ''}
                                        </div>
                                        <div className=" text-sm">
                                            {a.id}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div className='flex-1 flex'>
                    <div className="bg-neutral-800 py-8 px-12 overflow-y-scroll flex-1">
                        {
                            tabs[working].hello ? (
                                <>
                                    <div className="bg-blue-900 p-2 mb-2">
                                        <div className="font-bold text-lg">
                                            Working Area - Tab {working + 1}
                                        </div>
                                        <div className="mt-3 text-3xl">
                                            Hello!
                                        </div>

                                        <div className='my-3 gap-y-2'>
                                            This is Polygon Create Site! <br />
                                            Wala <br />
                                            TTPD
                                        </div>
                                    </div>

                                    <div className='mt-4'>
                                        <div className='text-xl font-bold'>
                                            Contest Description
                                        </div>
                                        <div className='my-2'>
                                            Class
                                        </div>
                                        <input type='text' value={contestData.class} className='bg-neutral-700 p-2' name='class' onChange={onContestChange} />

                                        <div className='my-2'>
                                            Name
                                        </div>
                                        <input type='text' value={contestData.name} className='bg-neutral-700 p-2' name='name' onChange={onContestChange} />

                                        <div className='my-2'>
                                            Date
                                        </div>
                                        <input type='text' value={contestData.date} className='bg-neutral-700 p-2' name='date' onChange={onContestChange} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-blue-900 p-2 mb-2">
                                        <div className="font-bold text-lg">
                                            Working Area - Tab {working + 1}
                                        </div>
                                        <div className="">
                                            Problem: <div className="inline font-bold">{tabs[working].name}</div>
                                        </div>
                                        <div>
                                            ID: {tabs[working].id}
                                        </div>
                                        <div>
                                            Owner: {tabs[working].owner}
                                        </div>
                                    </div>

                                    <div className='bg-orange-900 hover:bg-orange-700 p-2 w-min px-10 my-4' onClick={switchToTest}>
                                        Switch
                                    </div>

                                    {whichPage ?
                                        <>
                                            <div className='my-4'>
                                                <div className='font-bold text-xl'>
                                                    Info
                                                </div>
                                                <div className='my-2'>
                                                    Time limit
                                                </div>
                                                <input type='number' max='5000' min='1' value={tabs[working].info.timeLimit} name='timeLimit' onChange={onChangeInfo} className='bg-neutral-700 p-2' />

                                                <div className='my-2'>
                                                    Input
                                                </div>
                                                <input type='text' value={tabs[working].info.inputFile} onChange={onChangeInfo} name='inputFile' className='bg-neutral-700 p-2' />

                                                <div className='my-2'>
                                                    Output
                                                </div>
                                                <input type='text' value={tabs[working].info.outputFile} onChange={onChangeInfo} name='outputFile' className='bg-neutral-700 p-2' />

                                                <div className='my-2'>
                                                    Memory
                                                </div>
                                                <input type='number' max='1024' min='1' value={tabs[working].info.memoryLimit} onChange={onChangeInfo} name='memoryLimit' className='bg-neutral-700 p-2' />

                                                <div className='hover:bg-blue-600 bg-blue-700 p-2 w-min px-10 my-4' onClick={saveInfo}>
                                                    Save
                                                </div>
                                            </div>

                                            <div className='my-4'>
                                                <div className='font-bold text-xl'>
                                                    Validator
                                                </div>

                                                <div>
                                                    {tabs[working].validator}
                                                </div>
                                            </div>

                                            <div className='my-4'>
                                                <div className='font-bold text-xl'>
                                                    Checker
                                                </div>

                                                <div>
                                                    {tabs[working].checker}
                                                </div>
                                            </div>

                                            <div className='my-4'>
                                                <div className='font-bold text-xl'>
                                                    Statement
                                                </div>
                                                <div className='my-2'>
                                                    Encoding: {tabs[working].statements.encoding}
                                                </div>

                                                <div className='my-2'>
                                                    Name
                                                </div>
                                                <input type='text' value={tabs[working].statements.name} className='bg-neutral-700 p-2' name='name' onChange={onChangeStatement} />

                                                <div className='my-2'>
                                                    Legend
                                                </div>

                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].statements.legend} name='legend' onChange={onChangeStatement} />



                                                <div className='my-2'>
                                                    Input
                                                </div>
                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].statements.input} name='input' onChange={onChangeStatement} />



                                                <div className='my-2'>
                                                    Output
                                                </div>
                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].statements.output} name='output' onChange={onChangeStatement} />



                                                <div className='my-2'>
                                                    Notes
                                                </div>
                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].statements.notes} name='notes' onChange={onChangeStatement} />



                                                <div className='my-2'>
                                                    Scoring
                                                </div>
                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].statements.scoring} name='scoring' onChange={onChangeStatement} />



                                                <div className='my-2'>
                                                    Tutorial
                                                </div>
                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].statements.tutorial} name='tutorial' onChange={onChangeStatement} />

                                                <div className='hover:bg-blue-600 bg-blue-700 p-2 w-min px-10 my-4' onClick={saveStatement}>
                                                    Save
                                                </div>
                                            </div>
                                        </> :
                                        <>
                                            <div className='my-4'>
                                                <div className='font-bold text-xl'>
                                                    Solution
                                                </div>

                                                <div className='my-2'>
                                                    {tabs[working].solution.name}
                                                </div>

                                                <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={tabs[working].solution.file} name='legend' onChange={onChangeSolution} />

                                                <div className='hover:bg-blue-600 bg-blue-700 p-2 w-min px-10 my-4' onClick={saveSolution}>
                                                    Save
                                                </div>
                                            </div>

                                            <div className='my-4'>
                                                <div className='font-bold text-xl'>
                                                    Example test
                                                </div>

                                                {tabs[working].tests.map((x, i) =>
                                                    <>
                                                        <div className='my-2'>
                                                            Test {x.index}
                                                        </div>

                                                        <textarea className='bg-neutral-700 p-2 w-full' rows='10' value={x.input} onChange={(e) => onChangeTest(e, i)} />

                                                        <div className='flex gap-3'>
                                                            <div className='hover:bg-blue-600 bg-blue-700 p-2 w-min px-10 my-4' onClick={() => saveTest(i)}>
                                                                Save
                                                            </div>

                                                            <div className='hover:bg-green-600 bg-green-700 p-2 w-fit px-10 my-4' onClick={() => previewTest(i)}>
                                                                Preview Test
                                                            </div>
                                                        </div>

                                                        <div>
                                                            Output
                                                        </div>

                                                        <div className='border-4 mt-2 p-2 border-blue-600'>
                                                            {x.output}
                                                        </div>

                                                    </>)}

                                                <div className='hover:bg-green-600 bg-green-700 p-2 w-fit px-10 my-4' onClick={newTest}>
                                                    New Test
                                                </div>
                                            </div>
                                        </>}

                                    <hr />

                                    <div className='hover:bg-green-600 bg-green-700 p-2 w-min px-10 my-4' onClick={commit}>
                                        Commit
                                    </div>

                                    <div className='hover:bg-yellow-600 bg-yellow-700 p-2 w-fit px-10 my-4' onClick={buildPackage}>
                                        Build Package
                                    </div>
                                </>)
                        }

                    </div>

                    {
                        openPreview ?
                            <div className='basis-1/2 pt-5'>
                                <iframe title='latex' className='w-full h-full bg-white' sandbox="allow-same-origin allow-scripts" srcdoc={latexHtml} />
                            </div> :
                            <></>
                    }

                    <div className='hover:bg-green-600 bg-green-700 text-white p-2' onClick={() => setOpenPreview(!openPreview)}>
                        P
                    </div>
                </div>
            </div >
        </>
    );
};

export default Homepage;