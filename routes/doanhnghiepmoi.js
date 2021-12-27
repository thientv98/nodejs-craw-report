var express = require('express');
var router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const json2xls = require('json2xls');
const xl = require('excel4node');
const fsPromise = require('fs').promises;
const fs = require('fs');

router.get('/', async (req, res, next) => {

    const baseUrl = 'https://doanhnghiepmoi.vn/TP-Ho-Chi-Minh/trang-'
    let beginPage = 4100
    let endPage = 5000
    let arrPage = []
    let destinationPath = 'assets/doanhnghiepmoi/'

    for(let index = beginPage; index <= endPage; index++) {
        arrPage.push(index)
    }

    let writeFilePath = destinationPath + 'page-'+beginPage+'-'+endPage+'.xlsx'

    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('Sheet 1');

    ws.cell(1, 1).string('STT');
    ws.cell(1, 2).string('TÊN CÔNG TY');
    ws.cell(1, 3).string('CHỦ SỞ HỮU/GIÁM ĐỐC');
    ws.cell(1, 4).string('ĐỊA CHỈ');
    ws.cell(1, 5).string('MÃ SỐ THUẾ');
    ws.cell(1, 6).string('SDT');
    ws.cell(1, 7).string('NOTE');

    ws.column(2).setWidth(50);
    ws.column(3).setWidth(25);
    ws.column(4).setWidth(50);
    ws.column(5).setWidth(30);
    ws.column(6).setWidth(20);
    let row = 2;

    for await (page of arrPage) {

        let links = await getDataList(baseUrl + page)

        if(links) {
            for await (link of links) {
                const detail = await getDataDetail(link)
                if(detail) {
                    console.log(page, detail);
                    ws.cell(row, 1).number(row-1);
                    ws.cell(row, 2).string(detail.company_name);
                    ws.cell(row, 3).string([detail.chu_so_huu, detail.giam_doc].join('/'));
                    ws.cell(row, 4).string(detail.address);
                    ws.cell(row, 5).string(detail.ma_so_thue);
                    ws.cell(row, 6).string(detail.phone);

                    row++;
                }
            }

        }
    }

    // save file
    wb.write(writeFilePath);

    res.json(1);
})

async function getDataList(url) {
    let response = await axios(url).catch((err) => console.log(err));
    if(response.status == 200) {
        const html = response.data;
        const $ = cheerio.load(html);

        const link = $('.main-content .list-company .company-item .company-name a');

        let links = []
        link.each(function() {
            const url = $(this).attr('href');
            links.push(url)
        });

        return links

    } else {
        return null
    }
}

async function getDataDetail(url) {
    let response = await axios(url).catch((err) => console.log(err));
    if(response.status == 200) {
        const html = response.data;
        const $ = cheerio.load(html);

        
        const phone = $('.main-content .company-info .row div:contains("Điện thoại:")').siblings().text()
        if(phone) {
            const companyName = $('.main-content .company-info .row div:contains("Tên doanh ngiệp:")').siblings().text()
            const chuSoHuu = $('.main-content .company-info .row div:contains("Chủ sở hữu:")').siblings().text()
            const giamDoc = $('.main-content .company-info .row div:contains("Giám đốc:")').siblings().text()
            const address = $('.main-content .company-info .row div:contains("Địa chỉ trụ sở:")').siblings().text()
            const maSoThue = $('.main-content .company-info .row div:contains("Mã số thuế:")').siblings().text()

            const data =  {
                company_name: companyName,
                chu_so_huu: chuSoHuu,
                giam_doc: giamDoc,
                address: address,
                ma_so_thue: maSoThue,
                phone: phone
            }
    
            return data
        } else {
            return null
        }
        
    } else {
        return null
    }
}

module.exports = router;