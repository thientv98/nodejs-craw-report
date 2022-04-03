var express = require('express');
var router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const json2xls = require('json2xls');
const fs = require('fs');
const xl = require('excel4node');
const fsPromise = require('fs').promises;

router.get('/custom', async (req, res, next) => {
    let url = encodeURI(req.query.url)
    let from = req.query.from || 1
    let to = req.query.to || 2

    const data = await getDataDetails(url, from, to)

    res.json(data);
})

router.get('/json', async (req, res, next) => {
    const json = require('../json/1.json')

    var xls = json2xls(json, {
        fields: {device:'string'}
    });
    
    fs.writeFileSync('data.xlsx', xls, 'binary');

    res.json(1);
})

/* GET home page. */
router.get('/', async (req, res, next) => {
    // const categories = require('../json/trangvang/categories.json')
    
    // const categories = await getCategories()
    const categories = require('../json/trangvang/categories-binh-duong.json')

    // const categoriesHCM = await getUrlHoChiMinh(categories)
    // res.json(categoriesHCM)

    // const categoriesBinhDuong = await getUrlBinhDuong(categories)
    // res.json(categoriesBinhDuong)

    let destinationPath = 'assets/trangvang-binhduong/'

    for await (category of categories) {
        let name = category.name.trim().replace('/', ' ').replace('\\', '').replace(':', '').replace('*', '').replace('?', '')
            .replace('<', '').replace('>', '').replace('|', '').replace('"', '')

            
        let writeFilePath = destinationPath + name +'.xlsx'

        if (!fs.existsSync(writeFilePath)) {

            const url = encodeURI(category.url)
            // const url = category.url
            if(category.url && url !== 'undefined') {
                console.log(category.url);

                category.url = url
                const data = await getDataDetails(category.url) 

                if(data.length > 0) {
                    var wb = new xl.Workbook();
                    var ws = wb.addWorksheet('Sheet 1');

                    ws.cell(1, 1).string('STT');
                    ws.cell(1, 2).string('TÊN CÔNG TY');
                    ws.cell(1, 3).string('NGÀNH');
                    ws.cell(1, 4).string('ĐỊA CHỈ');
                    ws.cell(1, 5).string('EMAIL');
                    ws.cell(1, 6).string('SDT');

                    ws.column(2).setWidth(50);
                    ws.column(3).setWidth(25);
                    ws.column(4).setWidth(50);
                    ws.column(5).setWidth(20);
                    ws.column(6).setWidth(20);

                    let row = 2;

                    data.map(detail => {
                        ws.cell(row, 1).number(row-1);
                        ws.cell(row, 2).string(detail.name);
                        ws.cell(row, 3).string(detail.branch);
                        ws.cell(row, 4).string(detail.address);
                        ws.cell(row, 5).string(detail.email);
                        ws.cell(row, 6).string(detail.phone);
                        row++;
                    })

                    // save file
                    wb.write(writeFilePath);
                }
            }
        }
    }

    // const data = await getDataDetails(categories[0].url)

    // res.json([])

    

    // const categoriesHCM = await getUrlHoChiMinh(categories)


    // const data = await fetchDataPage(categories)

    // let url = encodeURI('https://trangvangvietnam.com/cateprovinces/25960/bình-ắc-quy-ở-tại-tp.-hồ-chí-minh-(tphcm).html')
    // const data = await getDataDetails(url)
    
    // const promises = [];
    // const data = [];
    // for(let i=2000; i < categories.length; i++) {
    //     const path = './export/'+categories[i].name.trim()+'.xlsx'
    //     if (!fs.existsSync(path)) {
    //         const url = encodeURI(categories[i].url)
    //         if(url !== 'undefined') {
    //             promises.push(getDataDetails(url))
    //         }
    //     }
    // }

    // const resPages = await Promise.all(promises)

    // resPages.forEach((resPage, index) => {

    //     let name = categories[index].name.trim().replace('/', ' ').replace('\\', '').replace(':', '').replace('*', '').replace('?', '')
    //     .replace('<', '').replace('>', '').replace('|', '').replace('"', '')
    //     const path = './export/'+name+'.xlsx'

    //     if (fs.existsSync(path)) {
    //         console.log('file exists ' + path);
    //     } else {
    //         console.log('Save to ' + path);
    //         const xls = json2xls(resPage);
    //         fs.writeFileSync(path, xls, 'binary');
    //     }
    // })

    // res.json(categories.length);
});

async function getUrlHoChiMinh(categories) {
    let promisePage = []
    // categories.map(category => {
    //     promisePage.push(fetchData(category.url))
    // })
    let i = 0;
    for(i; i < categories.length; i++) {
        promisePage.push(fetchData(categories[i].url))
    }
    
    const resPages = await Promise.all(promisePage)

    resPages.forEach((response, index) => {
        
        if(response.status == 200) {
            const html = response.data;
            const $ = cheerio.load(html);
            const link = $('p.newlocnganhnghetxt a:contains("Tp. Hồ Chí Minh (TPHCM)")').attr('href');
            console.log(link);

            categories[index].url = link
        } else {
            console.log(2222);
        }
    })
    return categories
}

async function getUrlBinhDuong(categories) {
    let promisePage = []
    // categories.map(category => {
    //     promisePage.push(fetchData(category.url))
    // })
    let i = 1000;
    let start = 1000;
    let data = [];
    for(i; i < 1004; i++) {
        console.log(categories[i].url);
        promisePage.push(fetchData(categories[i].url))
    }
    
    const resPages = await Promise.all(promisePage)

    resPages.forEach((response, index) => {
        
        if(response.status == 200) {
            const html = response.data;
            const $ = cheerio.load(html);
            const link = $('p.newlocnganhnghetxt a:contains("Bình Dương")').attr('href');
            console.log(link);

            if(link) {
                data.push({
                    name: categories[start+index].name,
                    link: link
                });
            }
        } else {
            console.log(2222);
        }
    })
    return data
}

async function fetchData(url){
    let response = await axios(url).catch((err) => console.log(err));

    // if(response.status !== 200){
    //     console.log("Error occurred while fetching data");
    //     return;
    // }
    return response;
}

async function getLength(url){
    let response = await axios(url).catch((err) => console.log(err));

    console.log(url);
    if(response) {
        if(response.status !== 200){
            console.log("Error occurred while fetching data");
            return;
        }
    
        const html = response.data;
        const $ = cheerio.load(html);
    
        const page = $('#paging a:nth-last-child(2)').text();
    
        return page;
    }
    return 0
}

async function getDataDetails(baseUrl){
    const url = baseUrl + "?page=";
    let length = await getLength(url + '1');

    console.log(baseUrl, 'xxxx', length);
    
    let data = [];

    let promisePage = []
    let page = 1

    for(page = 1; page <= length; page++) {
        promisePage.push(fetchData(url + page))
    }

    const resPages = await Promise.all(promisePage)

    resPages.forEach((resPage) => {
        if(resPage) {
            const html = resPage.data;
            const $ = cheerio.load(html);
            const company = $('#listingsearch .boxlistings')
            company.each(function() {
                const name = $(this).find('.company_name a').text()
                const branch = $(this).find('.logo_address .address_listings p.diachisection:nth-child(1)').text()
                const address = $(this).find('.logo_address .address_listings p.diachisection:nth-child(2)').text()
                const phone = $(this).find('.logo_address .address_listings p.thoaisection').text()
                let email = $(this).find('.listings_phanduoi .box_email .email_text a').attr('href')
                if(email) {
                    email = email.trim().replace('mailto:', '')
                    data.push({
                        name,
                        branch,
                        address,
                        phone,
                        email
                    })
                }
            });
        }
    })

    return data
}

async function getCategories() {
    const baseUrl = 'https://trangvangvietnam.com/findex.asp'
    let length = await getLength(baseUrl)
    const url = baseUrl + "?page=";
    
    let data = [];

    let promisePage = []

    for(let page = 1; page <= length; page++) {
        promisePage.push(fetchData(url + page))
    }

    const resPages = await Promise.all(promisePage)

    resPages.forEach((resPage) => {
        const html = resPage.data;
        const $ = cheerio.load(html);
        const category = $('#khung_subpages > div:nth-child(3) > div:nth-child(1) > div[style*="padding-left:21px"] a')
        category.each(function() {
            const name = $(this).text().trim();
            const url = $(this).attr('href');
            data.push({
                name, url
            })
        });
    })

    return data
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

module.exports = router;
