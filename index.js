require('dotenv').config()

const express = require('express'),
    aws = require('aws-sdk'),
    multer = require('multer'),
    multerS3 = require('multer-s3'),
    helmet = require('helmet'),
    cors = require('cors'),
    morgan = require('morgan'),
    xss = require('xss-clean'),
    hpp = require('hpp');

const app = express(),
    s3 = new aws.S3();

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.raw())
app.use(express.text())
app.use(morgan('dev'))
app.use(cors())
app.use(helmet()) //Adds extra headers to protect the routes
app.use(xss()) //To prevent a harmful script being sent with the POST request
app.use(hpp()) //To prevent HTTP Parameter Pollution.

aws.config.update({
    secretAccessKey: process.env.aws_secret_access_key,
    accessKeyId: process.env.aws_access_key_id,
    region: process.env.AWS_REGION
});

const upload = multer({
    storage: multerS3({
        acl: "public-read",
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        key: function (req, file, cb) {
            const folderName = req.query.folderName
            //use Date.now() for unique file keys
            folderName ? cb(null, `${folderName}/${Date.now()}-${file.originalname}`) : cb(null, `${Date.now()}-${file.originalname}`);
        }
    })
});

/**
 * Delete Object
 */
const deleteObject = (bucketName, folderPath, key) => {
    return new Promise((resolve, reject) => {
        s3.createBucket({
            Bucket: `${bucketName}/${folderPath}`        /* Put your bucket name */
        }, function () {
            s3.deleteObject({
                Bucket: `${bucketName}/${folderPath}`,
                Key: key
            }, function (err, data) {
                if (err) {
                    reject(err)
                }
                else {
                    const response = {
                        message: "Successfully deleted file from bucket",
                        data: data,
                    }
                    resolve(response)
                }
            });
        });
    });
}

/**
 * List Objects
 */
const listObjects = (bucketName) => {
    return new Promise((resolve, reject) => {
        s3.listObjects({
            Bucket: bucketName,
            // Delimiter: '/',
            Prefix: 'Centric'
        }, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
}

/**
 * Read Object
 */
const readObject = (bucketName, folderPath, key) => {
    return new Promise((resolve, reject) => {
        s3.createBucket({
            Bucket: `${bucketName}/${folderPath}`        /* Put your bucket name */
        }, function () {
            s3.getObject({
                Bucket: `${bucketName}/${folderPath}`,
                Key: key
            }, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    console.log("Successfully dowloaded data from  bucket");
                    resolve(data);
                }
            });
        });
    });
}
//open in browser to see upload form
app.get('/', function (req, res) {
    res.status(200).json({
        message: 'AWS S3 file upload running successfully',
        url: {
            single: `http://localhost:${PORT}/files/upload/single`,
            multiple: `http://localhost:${PORT}/files/upload/multiple`
        },
        params: {
            file: 'this is the name of the input field',
            folderName: `if you want to place files in a folder, add folderName as query string`,
            format: `http://localhost:${PORT}/files/upload/single/single?folderName=my_files`
        }
    })
});

const uploadLimit = process.env.MULTIPLE_FILE_UPLOAD_LIMIT || 12
//use by upload form
app.post('/files/upload/multiple', upload.array('file', uploadLimit), async (req, res) => {
    try {
        res.status(200).json({
            message: 'Uploaded',
            fileData: req.files
        })
    } catch (error) {
        res.status(400).json({
            message: 'Error uploading',
            error: error
        });
    }
});

app.post('/files/upload/single', upload.single('file'), async (req, res) => {
    try {
        res.status(200).json({
            message: 'Uploaded',
            fileData: req.file
        })
    } catch (error) {
        res.status(400).json({
            message: 'Error uploading',
            error: error
        });
    }
});

/**
 * Delete Files
 */
app.delete('/files/delete/:folderPath/:key', async (req, res) => {
    deleteObject(process.env.AWS_S3_BUCKET_NAME, req.params.folderPath, req.params.key)
        .then((result) => {
            res.status(200).json({
                result
            })
        }).catch((err) => {
            res.status(500).json({
                message: 'An error occurred',
                error: err
            })
        });
})

/**
 * List Objects
 */
app.get('/files', async (req, res) => {
    listObjects(process.env.AWS_S3_BUCKET_NAME)
        .then((result) => {
            res.status(200).json({
                result
            })
        }).catch((err) => {
            res.status(500).json({
                message: 'an error occurred',
                error: err
            })
        });
})

/**
 * Read Object
 */
app.get('/files/read/:folderPath/:key', async (req, res) => {
    readObject(process.env.AWS_S3_BUCKET_NAME, req.params.folderPath, req.params.key)
        .then((result) => {
            res.status(200).json({
                result
            })
        }).catch((err) => {
            res.status(500).json({
                message: 'an error occurred',
                error: err
            })
        });
})

/**
 * Server Port
 */
const PORT = process.env.PORT || 8080
app.listen(PORT, function () {
    console.log(`File Upload Micro-Service running on Port:${PORT}`);
});