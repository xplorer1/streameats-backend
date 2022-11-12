const config = require('../../config');

const fs = require("fs");
const util = require("util");
const unLinkFile = util.promisify(fs.unlink)

const MenuModel = require('../models/MenuModel');
const RestaurantModel = require('../models/RestaurantModel');
const AWS = require('aws-sdk');

var imageId = function () {
    return Math.random().toString(36).substr(2, 10);
};

var s3 = new AWS.S3({
    accessKeyId: config.aws_s3.ACCESS_KEY_ID,
    secretAccessKey: config.aws_s3.SECRET_ACCESS_KEY,
    Bucket: config.aws_s3.BUCKET_NAME,
    apiVersion: '2006-03-01',
    region: config.aws_s3.region,
    ACL : "public-read",
    grantee : "Everyone"
});

module.exports = {

    createMenuItem: async function(req, res) {
        try {
            let restaurant = await RestaurantModel.findOne({email: req.verified.email}).exec();
            if(!restaurant) return res.status(404).json({status: 404, message: 'Restaurant not found.'});
           
            let file_stream = fs.createReadStream(req.file.path);

            let params = {
                Bucket: config.aws_s3.BUCKET_NAME,
                Key: imageId(),
                Body: file_stream
            };

            s3.upload(params, async function(err, data) {
                if (err) return res.status(500).json({status: 500, message: err.message});

                let new_menu = new MenuModel();
                new_menu.description = req.body.description;
                new_menu.restaurant = restaurant._id;
                new_menu.price = req.body.price;
                new_menu.menu_image = data.key;

                await new_menu.save();
                await unLinkFile(req.file.path);

                let menu_items = await MenuModel.find({restaurant: restaurant._id}).exec();

                if(restaurant.visibility_status === "closed" && menu_items.length === 0) {
                    restaurant.visibility_status = "open";
                    await restaurant.save();
                }
                
                return res.status(200).json({message: "Menu item created successfully."});
            });

        } catch (error) {
            return res.status(500).json({
                message: error.message,
                status: 500
            });
        }
    },

    listMenuItems: async function(req, res) {
        let {page = 1, limit = 10} = req.query;

        try {
            let menu_items = await MenuModel.find({restaurant: req.params.restaurant}).limit(limit * 1).skip((page - 1) * limit).exec();
            let count = await MenuModel.countDocuments({restaurant: req.params.restaurant}).exec();

            return res.status(200).json({status:true, data: menu_items, total_pages: Math.ceil(count / limit), current_page: page, elements: count});
        } catch (error) {
            return res.status(500).json({
                message: error.message,
                status: 500
            });
        }
    },

    deleteMenuItem: async function(req, res) {
        try {
            let menu_item = await MenuModel.find({_id: req.params.menu_item, phone: req.verified.phone}).exec();
            if(!menu_item) return res.status(404).json({status: 404, message: "Invalid menu ID."});

            let delete_item = await MenuModel.deleteOne({_id: req.params.menu_item}).exec();
            if(!delete_item) return res.status(500).json({status: 500, message: "Unable to delete menu item."});

            return res.status(200).json({message: "Menu item successfully deleted."});
        } catch (error) {
            return res.status(500).json({ message: error.message, status: 500 });
        }
    },
}