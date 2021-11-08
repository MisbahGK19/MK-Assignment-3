// import dependencies you will use
const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');

//get expression session
const session = require('express-session'); 

// set up expess validator
const {check, validationResult} = require('express-validator'); //destructuring an object

// set up variables to use packages
var myApp = express();

myApp.use(express.urlencoded({extended:false})); // new way after Express 4.16

myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');
myApp.use(fileUpload());


//set up session
myApp.use(session({
    secret: 'H2a3P4p5Y',
    resave: false,
    saveUninitialized: true
}));

//Set up and connect to database
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/blogData', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// define the collection for page
const Page = mongoose.model('Page',{
    title : String,
    fileName : String,
    article : String
});
// define the collection for admin
const Admin = mongoose.model('Admin',
{
    username : String,
    password : String,
})

//get the home page
myApp.get('/', function(req, res){
    Page.find({}).exec(function(err, pages){
         console.log('Error' + err);
        res.render('home', {pages : pages})
    });
});

//get the display page to display the nav_menu data
myApp.get('display', function(req, res){
    Page.find({}).exec(function(err, pages){
         console.log('Error' + err);
        res.render('display', {pages : pages})
    });
});

//get the login page
myApp.get('/login',function(req, res){
    Page.find({}).exec(function(err, pages){
        res.render('login', {pages: pages})
    });
});

//function for the login page
myApp.post('/login', function(req, res){
    //storing the user input to variable
    var username = req.body.username;
    var password = req.body.password;
    //finding the input in the database
    Admin.findOne({ username : username, password : password}).exec(function(err, admin){
        console.log('Error:' + err);
        console.log('Admin:'+ admin)
        //condition if data exists
        if(admin){
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            //redirect to dashboard page
            res.redirect('dashboard');
        }else{
            //renders the login page
            res.render('login', {error: 'Invalid login credentials'})
        }
    });
});

//to get the dashboard page
myApp.get('/dashboard', function(req, res){
/*     condition to check if users session exists */    
    if(req.session.userLoggedIn){
        res.render('dashboard')
    }else{
        res.redirect('/login')
    }  
});

//to get the addPages page
myApp.get('/addPage', function(req, res){
    Page.find({}).exec(function(err, pages){
        res.render('addPage', {pages:pages}); //pass all pages to dashboard
    });
});

//function for the add page 
myApp.post('/addPage',[
    check('title', 'Enter title of the Page').not().isEmpty(),
], function(req, res){
    Page.find({}).exec(function(err, pages){
        const errors = validationResult(req);
        console.log(errors);
        console.log("File: " + req.files.imageFile);
            //condition to check if there are any error  
            if(!errors.isEmpty())
            {
                res.render('addPage',{er: errors.array()});
            }
            else{
                //storing user input to variables
                var title = req.body.title;
                var article = req.body.article;
                var fileName = req.files.imageFile.name;
                var imageFile = req.files.imageFile;
                var imagePath = 'public/images/' + fileName;
                //moving the image file to the folder
                imageFile.mv(imagePath, function(err){
                    console.log(err)
                });
                //storing all the information in variable              
                var outputData = {
                    title : title,
                    article : article,
                    pages:pages,
                    fileName : fileName,
                }
                //storing the information variable to database
                var pageData =  new Page(outputData);
                 pageData.save().then(function(){
                    console.log('Data Store');
                 }); 
            }
            //redirecting to the success message page
            res.redirect('addSuccess');
        });
})

//function for deleting a page from database using _id
myApp.get('/delete/:pageid', function(req,res){
    //condition to check use is logged in
    if(req.session.userLoggedIn){
        //storing the objectId to variable
        var pageID = req.params.pageid;
        console.log(pageID)
        //deleting the page by id
        Page.findByIdAndDelete({_id: pageID}).exec(function(err,page){
            console.log('Error' + err);
            console.log('Page Works' + page)
            //condition to check if that page exists with that _id
            if(page)
            {
                res.render('delete', {message: 'Successfully Delete'})
            }
            else{
                res.render('delete', {message: 'Could not Delete'})
            }
        });
    }else{
        //if user is not logged in then to direct to login page
        res.redirect('/login')
    }  
})

//getting the data from database
myApp.get('/editingPage/:pageid', function(req,res){
    //condition for user login session
    if(req.session.userLoggedIn){
        //finding information from database
        Page.find({}).exec(function(err, pages){
            //storing objectId to a variable
            var pageID = req.params.pageid;
            console.log(pageID);
            //finding an page with that id
            Page.findOne({_id: pageID}).exec(function(err,page){
                console.log('Error' + err);
                console.log('Page Works' + page)
                //condition to check if page exists with that id
                if(page)
                {
                    res.render('editingPage',{page: page})
                }
                else{
                    res.render('editingPage', {message: "Could not edit the article"})
                }
            });
        }); 
    }  
    else{
        //redirecting to login page if session does not exists
        res.redirect('/login')
    }
})

//function for editing the data on database
myApp.post('/editingPage/:id',[
    check('title', 'Enter title of the Page').not().isEmpty(),
], function(req, res){
        const errors = validationResult(req);
        console.log(errors);
        //condition for error messages
        if(!errors.isEmpty())
        {   
            //storing the ObjectId to a variable
            var id = req.params.id;
            //finding the page from database using object id
            Page.findOne({_id: id}).exec(function(err,page){
                console.log('Error' + err);
                console.log('Page Works' + page)
                //condition to check if page exists
                if(page)
                {
                    res.render('/editingPage',{page: page}, {er: errors.array()})
                }
                else{
                    res.send("Could not delete the article")
                }
            });
        }
        else{
            //storing the user edited information in variables
            var title = req.body.title;
            var article = req.body.article;
            var fileName = req.files.imageFile.name;
            var imageFile = req.files.imageFile;
            var imagePath = 'public/images/' + fileName;
            //moving the file to the path
            imageFile.mv(imagePath, function(err){
                console.log(err)
            });  
            //retrieving the id
            var id = req.params.id;
            //storing the data on page
            Page.findOne({_id:id}, function(err, page){
                page.title = title;
                page.article = article;
                page.fileName = fileName;
                page.save()
            });
             res.render('editSuccess');
        }
})

//getting the addSuccess Message Page
myApp.get('/addSuccess', function(req, res){
    Page.find({}).exec(function(err, pages){
        res.render('addSuccess', {pages: pages});
    });
}) 

//getting the edit Page 
myApp.get('/editPage', function(req, res){
    Page.find({}).exec(function(err, pages){
        res.render('editPage', {pages: pages});
    });
})

//fetching to the log out page
myApp.get('/logout', function(req, res){
    Page.find({}).exec(function(err, pages){
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('home', {pages: pages, error: 'Successfully logged out'});
   });
});

//if pageid is clicked them to fetch the page
myApp.get('/:pageid', function(req, res){
    Page.find({}).exec(function(err, pages){
        //storing ObjectId to variable
        var pageId = req.params.pageid;
        console.log(pageId)
        //finding the page with object id
        Page.findOne({_id: pageId}).exec(function(err, page){
            console.log('Error' + err);
            //condition to check if page exists
            if(page){
                res.render('display', {
                    title: page.title,
                    article: page.article,
                    fileName: page.fileName,
                    pages: pages
                }); 
            }
            else{
                pageId = false;
                res.redirect('login')
            }
   
        });
    });  
}); 

//connecting to port 8080
myApp.listen(8080);

//to chekc if everything works
console.log('Hi everything works fine.')