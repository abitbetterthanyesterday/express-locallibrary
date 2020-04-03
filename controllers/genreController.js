var Genre = require('../models/genre');
var Book = require('../models/book')
var async = require('async');
const validator = require('express-validator');

// Display list of all Genre.
exports.genre_list = function(req, res) {
  Genre.
    find().
    sort([['name', 'ascending']]).
    exec(function(err, list_genre){
      if(err){ return next(err) }
      res.render('genre_list',{title: 'List of genre', genre_list: list_genre});
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
  async.parallel({
    genre: function(callback){
      Genre.findById(req.params.id)
        .exec(callback);
    },

    genre_books: function(callback){
      Book.find({ 'genre': req.params.id})
        .exec(callback);
    },

  }, function(err, results) {
    if(err) { return next(err); }
    if(results.genre == null){ //no results
      var err = new Error('Genre not found')
      err.status= 404;
      return next(err)
    }
    //Successful so render
    res.render('genre_detail', {title: 'Genre detail', genre: results.genre, genre_books: results.genre_books});
  })
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
  res.render('genre_form.pug', {title: 'Create genre'});
};

// Handle Genre create on POST.
exports.genre_create_post = [
  
  // Validate that the field name is no empty
  validator.body('name', 'Genre name required').trim().isLength({ min: 1}),

  // Sanitize (escape) the name field
  validator.sanitizeBody('name').escape(),

  // Process request after validation and sanitization
  (req, res, next) =>{

    // Extract the validation errors from a request
    const errors = validator.validationResult(req);

    // Create a genre object with escaped and trimmed data
    var genre = new Genre({
      name: req.body.name
    });

    if(!errors.isEmpty()){
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', {title: 'Create genre', genre: genre, errors: errors.array()});
      return
    } else {
      // Data form is valid
      // Check if genre with the same name exists
      Genre.findOne({ 'name': req.body.name })
        .exec(function(err, found_genre){
          if (err) { return next(err) }

          if(found_genre){
            // Genre exists, redirect to its detail page.
            res.redirect(found_genre.url)
          } else {
            genre.save(function(err){
              if(err) { return next(err)}
              // Genre saved. Redirect to its detail page
              res.redirect(genre.url);
            })
          }

        })
    }
  }
]

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next){
  async.parallel({
      genre: function(callback){
        Genre.findById(req.params.id).exec(callback)
      },

      books: function(callback){
        Book.find({'genre': req.params.id}).exec(callback)
      },
    }, 
    function(err, results){
      if (err) { next(err)}
      if (results.genre == null){ //no results
        res.redirect('/catalog/genres');
      }
      //Success, render delete genre page
      res.render('genre_delete', {title: 'Delete genre', genre: results.genre, books: results.books})
    })
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
  async.parallel({
      genre: function(callback){
        Genre.findById(req.params.id).exec(callback)
      },

      books: function(callback){
        Book.find({'genre': req.params.id}).exec(callback)
      },
    }, 
    function(err, results){
      if(err){ next(err) }
      if(results.books.length > 0){
        //Books need to be deleted before we can delete the genre. Redirect to GET render.
        res.render('genre_delete', {title: 'Delete genre', genre: results.genre, books: results.books})
      } else {
      //Genre has no book, remove genre and redirect to genre list
        Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
          if(err){next(err)}
          // Success, redirect to Genre list
          res.redirect('/catalog/genres')
        })
      }
  })
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    async.parallel({
      genre: function(callback){
        Genre.findById(req.params.id).exec(callback)
      },

      books: function(callback){
        Book.find({'genre': req.params.id}).exec(callback)
      },
    }, 
    function(err, results){
      if (err) { next(err)}
      if (results.genre == null){ //no results
        res.redirect('/catalog/genres');
      }
      //Success, render Update genre page
      res.render('genre_form', {title: 'Update genre', genre: results.genre, books: results.books})
    })
};

// Handle Genre update on POST.
exports.genre_update_post = [
  
  // Validate that the field name is no empty
  validator.body('name', 'Genre name required').trim().isLength({ min: 1}),

  // Sanitize (escape) the name field
  validator.sanitizeBody('name').escape(),

  // Process request after validation and sanitization
  (req, res, next) =>{

    // Extract the validation errors from a request
    const errors = validator.validationResult(req);

    // Create a genre object with escaped and trimmed data
    var genre = new Genre({
      name: req.body.name,
      _id: req.params.id //this is required otherwise a new ID will be assigned
    });

    if(!errors.isEmpty()){
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', {title: 'Update genre', genre: genre, errors: errors.array()});
    } else {
      // Data form is valid
      // Check if genre with the same name exists
      // console.log('here');
      Genre.findByIdAndUpdate(req.params.id, genre, {}, function(err, thegenre){
        if (err) { return next(err) }
        //Successful, redirect to genre list page
        res.redirect('/catalog/genres');
      })
    }
  }
];