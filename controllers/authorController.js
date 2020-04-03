var Author = require('../models/author');
var async = require('async');
var Book = require('../models/book');
var { body, validationResult } = require('express-validator/check');
var { sanitizeBody } = require('express-validator/filter');

// Display list of all authors
exports.author_list = function (req,res){
  Author.
    find().
    sort([['family_name', 'ascending']]).
    exec(function(err, list_authors){
      if(err){ return next(err)}
      res.render('author_list', {title: 'Authors list', author_list:list_authors});
    })
};

// Display detail page for a specific author
exports.author_detail = function (req, res, next){
  console.log(req.params.id);
  async.parallel({
    author: function(callback){
    Author.findById(req.params.id)
      .exec(callback)
  },
  author_books: function(callback){
    Book.find({ 'author': req.params.id}, 'title summary')
    .exec(callback)
  },
}, function(err,results){
    if (err) { return next(err)}; //Error in API usage.
    if (results.author==null){ //No results.
      var err = new Error('Author not found');
      err.status = 404;
      return next(err);
    }
    //Successful so render.
    res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.author_books})
  })
};

// Display Author create form on GET.
exports.author_create_get = function(req, res) {
    res.render('author_form', {title: 'Create author'});
};

// Handle Author create on POST.
exports.author_create_post = [
  
  //Validate fields.
  body('first_name').isLength({min: 1}).trim().withMessage('First name must be specified.').
    isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({min: 1}).trim().withMessage('Family name must be specified').
    isAlphanumeric().withMessage('Family name has non-alphanumeric characters'),
  body('date_of_birth', 'Invalid date of birth.').optional({ checkFalsy: true}).isISO8601(),
  body('date_of_death', 'Invalid date of death.').optional({ checkFalsy: true}).isISO8601(),

  // Sanitize data
  sanitizeBody('first_name').escape(),
  sanitizeBody('family_name').escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),

  // Proceed with request after validation and sanitize
  (req, res, next) => {

    // Extract the validation errors from a request
    const errors = validationResult(req);
    console.log(errors);
    if(!errors.isEmpty()){
      //There are errors. Render the form again with sanitized values/error messages.
      res.render('author_form', {title: 'Create author', author: req.body, errors:errors.array()})
    } else {
      // Data form is valid

      // Create an object author with escaped and trimmed data.
      var author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death
      });

      author.save(function(err){
        if (err) { return next(err) }
        //Successfully saved - return to new author record
        res.redirect(author.url);
      })
    }
  }
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    async.parallel({
      author: function(callback){
        Author.findById(req.params.id).exec(callback);
      },

      author_books:function(callback){
        Book.find({'author': req.params.id}).exec(callback);
      },
    },
    function(err,result){
      if (err){ return next(err)}
      if (result.author == null){//no results
        res.redirect('/catalog/authors');
      }
      // successful so render
      res.render('author_delete', {title: 'Delete author', author:result.author, author_books: result.author_books})
    })
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
    
    async.parallel({
      author: function(callback){
        Author.findById(req.body.authorid).exec(callback)
      },
      author_books(callback){
        Book.find({'author':req.body.authorid}).exec(callback)
      },
    }, function(err,result){
      if (err) { next(err) }
      // Success
      if(result.author_books.length > 0){
        // Author has books. Render in the same way as for GET route
        res.render('author_delete', {title: 'Delete author', author: result.author, author_books: result.author_books})
      } else {
        // Author has no books. Delete object and redirect to the list of authors
        Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err){
          if (err) { next(err); }
          // Success. Go to author list
          res.redirect('/catalog/authors');
        })
      }
    })
};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
  //Get author
  async.parallel({
    author: function(callback){
      Author.findById(req.params.id).exec(callback)
    }
  }, function(err, results){
    if (err) { next(err)}
    if (results.author == null){ //no results
      res.redirect('/catalog/authors')
    }
    //Success, render form
    res.render('author_form', {title:'Update author', author: results.author})
  })
};

// Handle Author update on POST.
exports.author_update_post = [
  
  //Validate fields.
  body('first_name').isLength({min: 1}).trim().withMessage('First name must be specified.').
    isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({min: 1}).trim().withMessage('Family name must be specified').
    isAlphanumeric().withMessage('Family name has non-alphanumeric characters'),
  body('date_of_birth', 'Invalid date of birth.').optional({ checkFalsy: true}).isISO8601(),
  body('date_of_death', 'Invalid date of death.').optional({ checkFalsy: true}).isISO8601(),

  // Sanitize data
  sanitizeBody('first_name').escape(),
  sanitizeBody('family_name').escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),

  // Proceed with request after validation and sanitize
  (req, res, next) => {

    // Extract the validation errors of the request
    const errors = validationResult(req);

    // Create an object author with escaped and trimmed data, and old id.
      var author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        _id: req.params.id //This is required or a new ID will be assigned.
     });

    if(!errors.isEmpty()){
      //There are errors. Render the form again with sanitized values/error messages.
      res.render('author_form', {title: 'Update author', author: req.body, errors:errors.array()})
    } else {
      // Data form is valid. Update the record.
      // Author.findByIdAndUpdate(req.params.id)
        Author.findByIdAndUpdate(req.params.id, author, {}, function(err, theauthor){
          if (err) {return next(err)}
            //Successful, redirect to book page
          res.redirect(theauthor.url);
        })
    }
  }
];