var express = require('express');
var router = express.Router();
var UserController = require('../controllers/UserController');

var middlewares = require("../utils/middleware.js");
const multer = require('multer');
const upload = multer({dest: 'uploads/'}); //for handling multipart form data.

router.route('/')
    .post(UserController.signUpRestaurant)
    .get(middlewares.checkToken, UserController.getRestaurant)
    .put(middlewares.checkToken, UserController.updateRestaurant);

router.route('/pre_sign_up')
    .post(UserController.preSignUp)
    .get(UserController.getPreSignUps)

router.post('/attachments', middlewares.checkToken, upload.single('image'), UserController.updateRestaurantAttachments);
router.get('/attachments/:attachment_id', UserController.fetchAttachment);

router.get('/restaurants', UserController.listRestaurants);

router.get('/restaurant/:streameats_id', UserController.getRestaurantByStreamEatsId);

router.use(function(req, res) {
    return res.status(404).send({ message: 'The url you visited does not exist' });
});

module.exports = router;