var express = require('express');
var router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

/* GET home page. */
router.get('/', async (req, res, next) => {
    
    // const categories = await getCategories()
    const categories = require('../json/category.json')

    // const categoriesHCM = await getUrlHoChiMinh(categories)

    // const data = await fetchDataPage(categories)

    let url = encodeURI('https://trangvangvietnam.com/cateprovinces/25960/bình-ắc-quy-ở-tại-tp.-hồ-chí-minh-(tphcm).html')
    const data = await getDataDetails(url)

    // const promises = [];
    // const data = [];
    // for(let i=0; i< 1; i++) {
    //     promises.push(getDataDetails(categories[i].url))
    // }

    // const resPages = await Promise.all(promises)

    // resPages.forEach((resPage) => {
    //     console.log(resPages);
    // })

    res.json(data);
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

            categories[index].url = link
        } else {
            console.log(2222);
        }
    })
    return categories
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

    if(response.status !== 200){
        console.log("Error occurred while fetching data");
        return;
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const page = $('#paging a:nth-last-child(2)').text();

    return page;
}

async function getDataDetails(baseUrl){
    const url = baseUrl + "?page=";
    let length = await getLength(url + '1');
    length = length > 2 ? 2 : length
    
    let data = [];

    let promisePage = []

    for(let page = 1; page <= length; page++) {
        promisePage.push(fetchData(url + page))
    }

    const resPages = await Promise.all(promisePage)

    resPages.forEach((resPage) => {
        const html = resPage.data;
        const $ = cheerio.load(html);
        const company = $('#listingsearch .boxlistings')
        company.each(function() {
            const name = $(this).find('.company_name a').text()
            const branch = $(this).find('.logo_address .address_listings p.diachisection:nth-child(1)').text()
            const address = $(this).find('.logo_address .address_listings p.diachisection:nth-child(2)').text()
            const phone = $(this).find('.logo_address .address_listings p.thoaisection').text()
            data.push({
                name,
                branch,
                address,
                phone
            })
        });
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
        const category = $('#khung_subpages > div:nth-child(3) > div:nth-child(1) > div a')
        category.each(function() {
            const name = $(this).text()
            const url = $(this).attr('href');
            data.push({
                name, url
            })
        });
    })

    return data
}

module.exports = router;
