// 引入爬虫模块
const Crawler = require('crawler');
// 引入mongoose模块，操作mongoDB数据库
const db = require('mongoose');

// 连接数据库
db.connect('mongodb://localhost/test');

var Schema = db.Schema;

// 创建数据集合
var bookSchema = new Schema({
    name: String,
    image: String,
    author: String,
    link: String,
    publisher: String,
    price: Number,
    type: String
});

// 映射数据集合模型
var Book = db.model('Book', bookSchema);


var c = new Crawler({
    // 设置最大连接数
    maxConnections: 10,
    // 将下载回来的网页编码改为utf-8
    forceUTF8: true
});


// 第一层页面的爬取
c.queue({
    uri: 'http://bang.dangdang.com/books/bestsellers/01.41.00.00.00.00-24hours-0-0-1-1',
    callback: function (error, result) {
        if (error) {
            console.log(error);
        } else {
            var $ = result.$;
            $('#sortRanking > div a').each(function (index, item) {
                if (index < 5) {
                    var obj = {};
                    // 获取分类名
                    obj.name = $(item).text();
                    // 获取分类地址
                    obj.link = $(item).attr('href');
                    // 获取分类基地址
                    obj.baseLink = obj.link.slice(0, -1);
                    // 二层爬虫处理
                    deepFetch(obj);
                }
            });
        }
    }
});


// 深度爬虫
function deepFetch(obj) {
    // 从第一页开始抓取
    getData(obj.baseLink, 1);
    function getData(bLink, page) {
        c.queue({
            uri: bLink + page,
            callback: function (error, result, done) {
                if (error) {
                    console.log('二层错误信息：');
                    console.log(error);
                } else {
                    var $ = result.$;
                    // 遍历该页面所有的书籍条目
                    $('ul.bang_list > li').each(function (index, item) {
                        var book = new Book();
                        // 获取书名
                        book.name = $(item).find('div.name > a').text();
                        // 获取书籍图片
                        book.image = $(item).find('div.pic > a > img').attr('src');
                        // 获取作者
                        book.author = $(item).find('div.publisher_info > a').eq(0).text();
                        // 获取书籍链接
                        book.link = $(item).find('div.name > a').attr('href');
                        // 获取出版社信息
                        book.publisher = $(item).find('div.publisher_info > a').eq(-1).text();
                        // 获取书籍价格
                        book.price = $(item).find('div.price > p').eq(0).find('span').eq(0).text().substr(1);
                        // 获取书籍分类
                        book.type = obj.name;

                        book.save(function (err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('保存成功!');
                            }
                        });
                    });
                    // 断开连接，终止本次的爬取
                    done();
                    if (page < 25) {
                        // 递归操作，调用自身
                        getData(bLink, page + 1);
                    }
                }
            }
        });
    }
}