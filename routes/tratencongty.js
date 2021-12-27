var express = require('express');
var router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const json2xls = require('json2xls');
const xl = require('excel4node');
const fsPromise = require('fs').promises;
const fs = require('fs');

router.get('/', async (req, res, next) => {

    const urls = require('../json/tratencongty-100-300-thuduc')

    let destinationPath = 'assets/tratencongty/thuduc/'

    for await (page of urls) {
        let writeFilePath = destinationPath + 'page-'+page.page+'.xlsx'
        if (!fs.existsSync(writeFilePath)) {
            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('Sheet 1');

            ws.cell(1, 1).string('STT');
            ws.cell(1, 2).string('TÊN CÔNG TY');
            ws.cell(1, 3).string('NGƯỜI ĐẠI DIỆN PHÁP LUẬT');
            ws.cell(1, 4).string('ĐỊA CHỈ');
            ws.cell(1, 5).string('MÃ SỐ THUẾ');
            ws.cell(1, 6).string('SDT');
            ws.cell(1, 7).string('NOTE');
            ws.cell(1, 8).string('LINK');

            ws.column(2).setWidth(50);
            ws.column(3).setWidth(25);
            ws.column(4).setWidth(50);
            ws.column(5).setWidth(30);
            ws.column(6).setWidth(20);
            ws.column(8).setWidth(100);
            let row = 2;

            for await (url of page.urls) {
                let item = await getDataList(url)
                if(item) {
                    ws.cell(row, 1).number(row-1);
                    ws.cell(row, 2).string(item.tencongty);
                    ws.cell(row, 3).string(item.nguoidaidienphapluat);
                    ws.cell(row, 4).string(item.diachi);
                    ws.cell(row, 5).string(item.masothue);
                    // ws.cell(row, 6).string('sdt');
                    ws.cell(row, 8).link(item.note);
        
                    var base64Data = item.sdt.replace(/^data:image\/png;base64,/, "");
        
                    let filePath = "assets/phones/"+item.masothue +".png"
        
                    await fsPromise.writeFile(filePath, base64Data, 'base64')
        
                    ws.addImage({
                        path: filePath,
                        type: 'picture',
                        position: {
                            type: 'oneCellAnchor',
                            from: {
                            col: 6,
                            colOff: '0.1in',
                            row: row,
                            rowOff: '0.03in',
                            },
                        },
                    });
        
                    row++;
                }
            }

            // save file
            wb.write(writeFilePath);
        } 
    }

    res.json(1);
})

router.get('/geturl', async (req, res, next) => {

    const promises = [];
    let data = [];
    const baseUrl = "https://www.tratencongty.com/thanh-pho-ho-chi-minh/quan-thu-duc/?page="

    for(let i=100; i <= 300; i++) {
        promises.push(getUrlList(baseUrl + i))
    }

    const resPages = await Promise.all(promises)

    resPages.forEach((item, index) => {
        data.push({
            page: index + 100,
            urls: item
        })
    })

    res.json(data);
})


async function getDataList(url) {
    let response = await axios(url).catch((err) => console.log(err));

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
        console.log(2222);
    }
}

async function getUrlList(url) {
    let response = await axios(url).catch((err) => console.log(err));

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
        console.log(2222);
    }
}

module.exports = router;