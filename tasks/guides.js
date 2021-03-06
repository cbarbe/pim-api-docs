/**
 * Transform Markdown documentation to HTML
 */
var gulp = require('gulp');
var MarkdownIt = require('markdown-it');
var mdToc = require('markdown-it-toc-and-anchor').default;
var mdEmoji = require('markdown-it-emoji');
var flatmap = require('gulp-flatmap');
var insert = require('gulp-insert');
var path = require('path');
var gulpMarkdownIt = require('gulp-markdown-it-adapter');
var highlightJs = require('highlightjs');
var hbs = require('handlebars');
var gulpHandlebars = require('gulp-handlebars-html')(hbs);
var fs = require('fs');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var revReplace = require('gulp-rev-replace');

function getTocMarkdown(pages, currentPage, dirName) {
    return "\n\n:::: toc\n\n" + Object.keys(pages).map(function (page) {
          if (page === currentPage) {
              return '::: preToc ' + pages[page] + "\n:::\n@[toc]\n:::postToc\n:::";
          } else {
              return '::: tocLink [' + pages[page]+ '](/guides/' + dirName + '/' + page.replace(/\.md$/, '.html') + ")\n:::";
          }
      }).join("\n") + "\n\n::::\n\n";
}

function highlight(str, lang) {
    if (lang && highlightJs.getLanguage(lang)) {
        try {
            return '<pre class="hljs"><code>' +
              highlightJs.highlight(lang, str, true).value +
              '</code></pre>';
        } catch (__) {}
    }
    return '<pre class="hljs"><code>' + str + '</code></pre>';
}

gulp.task('guides', ['clean-dist','less'], function () {
      var optionsMd = {
          html: true,
          xhtmlOut: true,
          typographer: false,
          linkify: false,
          breaks: false,
          highlight: highlight
      };
      var optionsToc = {
          toc: true,
          tocFirstLevel: 2,
          tocLastLevel: 3,
          anchorLink: true,
          anchorLinkSpace: false,
          anchorLinkBefore: true,
          tocClassName: 'nav'
      };

      var md = new MarkdownIt('default', optionsMd);

      function imageTokenOverride(tokens, idx, options, env, self) {
          return '<img class="img-responsive" alt="'+ tokens[idx].content +'" src="'+ tokens[idx].attrs[0][1] + '"/>';
      }
      md.renderer.rules['image'] = imageTokenOverride;
      md.renderer.rules.table_open = function(tokens, idx) {
          return '<table class="table">';
      };
      md.renderer.rules.heading_open = function(tokens, idx) {
          return '<a class="anchor" id="' + tokens[idx].attrs[0][1] + '"></a>'+
            '<'+tokens[idx].tag+' title-id="' + tokens[idx].attrs[0][1] + '">';
      };

      md.use(mdEmoji);
      md.use(require('markdown-it-container'), 'danger', {
            validate: function(params) {
                return params.trim().match(/^danger(.*)$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '<div class="alert alert-danger">' : '</div>\n';
            }
        })
        .use(require('markdown-it-container'), 'warning', {
            validate: function(params) {
                return params.trim().match(/^warning(.*)$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '<div class="alert alert-warning">' : '</div>\n';
            }
        })
        .use(require('markdown-it-container'), 'info', {
            validate: function(params) {
                return params.trim().match(/^info(.*)$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '<div class="alert alert-info">' : '</div>\n';
            }
        })
        .use(require('markdown-it-container'), 'tips', {
            validate: function(params) {
               return params.trim().match(/^tips(.*)$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '<div class="alert alert-tips">' : '</div>\n';
            }
        })
        .use(require('markdown-it-container'), 'versions', {
            validate: function(params) {
                return params.trim().match(/^versions(.*)$/);
            },
            render: function (tokens, idx) {
                var id = tokens[idx].info.trim().match(/^versions\sid="(.*)"\s2\.x.*\s1\.7.*$/);
                var source_v2x = tokens[idx].info.trim().match(/^versions\sid=".*"\s2\.x(.*)\s1\.7.*$/);
                var source_v17 = tokens[idx].info.trim().match(/^versions\sid=".*"\s2\.x.*\s1\.7(.*)$/);
                return (tokens[idx].nesting === 1) ? '<div>' +
                    '<ul class="nav nav-tabs nav-tabs-versions" role="tablist">' +
                        '<li role="presentation" class="active"><a href="#v2_' + id[1] + '" aria-controls="v2_' + id[1] + '" role="tab" data-toggle="tab">v2.x</a></li>' +
                        '<li role="presentation"><a href="#v17_' + id[1] + '" aria-controls="v17_' + id[1] + '" role="tab" data-toggle="tab">v1.7</a></li>' +
                    '</ul>' +
                    '<div class="panel panel-default">' +
                        '<div class="panel-body">' +
                            '<div class="row tab-content">'+
                                '<div role="tabpanel" class="col-xs-12 tab-pane active" id="v2_' + id[1] + '">' + md.render(source_v2x[1]) + '</div>' +
                                '<div role="tabpanel" class="col-xs-12 tab-pane" id="v17_' + id[1] + '">' + md.render(source_v17[1]) + '</div>'
                         : '</div>\n</div>\n</div>\n</div>\n';
            }
        });

      md.use(mdToc, optionsToc)
        .use(require('markdown-it-container'), 'toc', {
            validate: function(params) {
                return params.trim().match(/^toc$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '<div id="navbar" class="col-sm-3 hidden-xs">' +
                '<nav role="tablist" id="navbar-nav" data-spy="affix" data-offset-top="80" class="affix-top"><ul class="nav nav-stacked"><p class="pre-nav">Summary</p>' :
                  "</ul></nav></div>\n";
            }
        })
        .use(require('markdown-it-container'), 'preToc', {
            validate: function(params) {
                return params.trim().match(/^preToc .*/);
            },
            render: function (tokens, idx) {
                var text = tokens[idx].info.trim().match(/^preToc (.*)$/);
                return (tokens[idx].nesting === 1) ? '<li class="active"><a href="#">' + text[1] + '</a>': '';
            }
        })
        .use(require('markdown-it-container'), 'postToc', {
            validate: function(params) {
                return params.trim().match(/^postToc$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '</li>' : '';
            }
        })
        .use(require('markdown-it-container'), 'mainContent', {
            validate: function(params) {
                return params.trim().match(/^mainContent$/);
            },
            render: function (tokens, idx) {
                return (tokens[idx].nesting === 1) ? '<div class="col-xs-12 col-sm-9">' : '</div>';
            }
        })
        .use(require('markdown-it-container'), 'tocLink', {
            validate: function(params) {
                return params.trim().match(/^tocLink\s+(.*)$/);
            },
            render: function (tokens, idx) {
                var linkTitle = tokens[idx].info.trim().match(/^tocLink.*\[(.*)\]\(.*\)$/);
                var link = tokens[idx].info.trim().match(/^tocLink.*\((.*)\)$/);
                return (tokens[idx].nesting === 1) ? '<li><a href="' + md.utils.escapeHtml(link[1]) + '">' + linkTitle[1] + '</a></li>' : '';
            }
        })

        .use(require('markdown-it-container'), 'panel-link', {
            validate: function(params) {
                return params.trim().match(/^panel-link\s+(.*)$/);
            },
            render: function (tokens, idx) {
                var text = tokens[idx].info.trim().match(/^panel-link\s+(.*)\[.*\].*$/);
                var linkTitle = tokens[idx].info.trim().match(/^panel-link\s+.*\[(.*)\].*$/);
                var link = tokens[idx].info.trim().match(/^panel-link\s+.*\((.*)\)$/);
                if (tokens[idx].nesting === 1) {
                    // opening tag
                    return '<div class="row" style="margin-top: 80px;"><div class="col-sm-offset-3 col-sm-6">' +
                      '<div class="panel panel-default panel-btn">'+
                      '<a href="' + md.utils.escapeHtml(link[1]) + '">' +
                      '<div class="panel-body">' +
                      '<div class="panel-btn-big">'+ md.utils.escapeHtml(text[1]) + '</div>'+
                      '<p class="text-center">'+ md.utils.escapeHtml(linkTitle[1]) + '</p>';
                } else {
                    // closing tag
                    return '</div></a></div></div></div>\n';
                }
            }
        });

    var pages = {
        'dam-connection': {
            'introduction.md': 'Introduction',
            'pre-requisites.md': 'Structure your DAM and your PIM',
            'technical-stack.md': 'Define your technical stack',
            'synchronize-assets.md': 'Dive into the synchronisation',
            'glossary.md': 'Glossary'
        }
    };

    return gulp.src('content/guides/**/*.md')
        .pipe(flatmap(function(stream, file){
            return gulp.src('content/guides/**/*.md')
              .pipe(insert.wrap("::::: mainContent\n", "\n:::::"))
              .pipe(insert.prepend(getTocMarkdown(pages[path.basename(path.dirname(file.path))], path.basename(file.path), path.basename(path.dirname(file.path))) + "\n"))
              .pipe(gulpMarkdownIt(md))
              .pipe(gulp.dest('tmp/guides/'))
              .on('end', function () {
                  return gulp.src('src/partials/documentation.handlebars')
                    .pipe(gulpHandlebars({
                        active_documentation:  true,
                        title: 'The complete guide to connect a DAM to your PIM',
                        mainContent: fs.readFileSync('tmp/guides/' + path.basename(path.dirname(file.path)) + '/' + path.basename(file.path).replace(/\.md/, '.html'))
                    }, {
                        partialsDirectory: ['./src/partials']
                    }))
                    .pipe(rename(path.basename(file.path).replace(/\.md/, '.html')))
                    .pipe(revReplace({manifest: gulp.src("./tmp/rev/rev-manifest.json")}))
                    .pipe(gulp.dest('./dist/guides/' + path.basename(path.dirname(file.path))));
              })
        }));
  }
);
