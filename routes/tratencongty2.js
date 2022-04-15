var express = require('express');
var router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const json2xls = require('json2xls');
const xl = require('excel4node');
const fsPromise = require('fs').promises;
const fs = require('fs');
const Tesseract = require('tesseract.js');
const ReadText = require('text-from-image')
const { createWorker } = require('tesseract.js');

const worker = createWorker();

router.get('/', async (req, res, next) => {
    res.setTimeout(0);
    const districts = require('../json/tratencongty')

    let destinationPath = 'assets/tratencongty2/'

    for await (district of districts) {

        console.log(district);

        let pages = initPage(district.from, district.to)

        var wb = null;
        var ws = null;
        var row = 2;
        var saveStep = 10;
        var lastStep = 0;

        for await (page of pages) {

            if(!wb) {
                // init sheet 
                wb = new xl.Workbook();
                ws = wb.addWorksheet(district.name);

                ws.cell(1, 1).string('STT');
                ws.cell(1, 2).string('TÊN CÔNG TY');
                ws.cell(1, 3).string('NGƯỜI ĐẠI DIỆN PHÁP LUẬT');
                ws.cell(1, 4).string('ĐỊA CHỈ');
                ws.cell(1, 5).string('MÃ SỐ THUẾ');
                ws.cell(1, 6).string('SDT');
                ws.cell(1, 7).string('NOTE');

                ws.column(2).setWidth(50);
                ws.column(3).setWidth(25);
                ws.column(4).setWidth(50);
                ws.column(5).setWidth(30);
                ws.column(6).setWidth(20);
                ws.column(8).setWidth(100);
            }
            
            // let writeFilePath = destinationPath + district.key + '/'+ district.key+'-'+ (lastStep+1) + '-' + (page) +'.xlsx'
            let max = lastStep+saveStep > district.to ? district.to : lastStep+saveStep
            let writeFilePath = `${destinationPath}${district.key}/${district.key}-${(lastStep+1)}-${max}.xlsx`
            console.log('File path', writeFilePath);
            if (!fs.existsSync(writeFilePath)) {

                console.log(district.name, 'page ' + page);

                var dir = destinationPath + district.key;

                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }

                let url = district.url + "?page=" + page
                
                let links = await getUrlList(url);

                let promises = [];

                for await (link of links) {
                    promises.push(getDataList(link))
                }

                const resPages = await Promise.all(promises)

                for await (item of resPages) {
                    if(item) {
                        let phoneRes = await parsePhone(item.sdt)
                        phoneRes = phoneRes.replace(/\s+/g, '');
                        ws.cell(row, 1).number(row-1);
                        ws.cell(row, 2).string(item.tencongty);
                        ws.cell(row, 3).string(item.nguoidaidienphapluat);
                        ws.cell(row, 4).string(item.diachi);
                        ws.cell(row, 5).string(item.masothue);
                        ws.cell(row, 6).string(phoneRes);
                        row++;
                        console.log(item.note, phoneRes);
                    }
                }
            }

            if(page == lastStep + saveStep || page == district.to) {
                // save file
                if (!fs.existsSync(writeFilePath)) {
                    wb.write(writeFilePath);
                }

                lastStep = page

                // reset wb
                wb = null;
                ws = null;
                row = 2;
            }
        }
    }
    res.json(111);
})

async function parsePhone(imgData) {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const {
        data: { text },
    } = await worker.recognize(imgData);
    // await worker.terminate();
    return text
}

function initPage(from, to) {
    let pages = []
    for (let i = from; i <= to; i++) {
        pages.push(i)
    }
    return pages
}

async function getUrlList(url) {
    let response = await axios(encodeURI(url)).catch((err) => console.log(err));

    if(response.status == 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        const link = $('.container .search-results > a');

        let links = []
        link.each(function() {
            const url = $(this).attr('href');
            links.push(url)
        });

        return links
    } else {
        console.log('Error ', url);
    }
}

async function getDataList(url) {
    let response = await axios(encodeURI(url)).catch((err) => console.log(err));

    if(response.status == 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        const company_name = $('.container .jumbotron h4 a').text();
        const content = $('.container .jumbotron').text();

        const sdt = $('body > div > div.col-xs-12.col-sm-9 > div.jumbotron > img').attr('src');

        if(sdt) {
            let nguoidaidienphapluat = ''
            if(content.search('Đại diện pháp luật:') != -1) {
                let substring = content.substring(content.search('Đại diện pháp luật:') + 20, content.length-1)
                nguoidaidienphapluat = substring.substring(0, substring.search('  '))
            }

            let diachi = ''
            if(content.search('Địa chỉ:') != -1) {
                let substring = content.substring(content.search('Địa chỉ:') + 8, content.length-1)
                diachi = substring.substring(0, substring.search('  '))
            }

            let masothue = ''
            if(content.search('Mã số thuế:') != -1) {
                let substring = content.substring(content.search('Mã số thuế:') + 11, content.length-1)
                masothue = substring.substring(0, substring.search('  '))
                masothue = masothue.replace("\n", "")
            }

            const data = {
                tencongty: company_name,
                nguoidaidienphapluat: nguoidaidienphapluat,
                diachi: diachi,
                masothue: masothue,
                sdt: sdt,
                note: url
            }
            return data;

        }

        return null

    } else {
        console.log('Error ', url);
    }
}

module.exports = router;