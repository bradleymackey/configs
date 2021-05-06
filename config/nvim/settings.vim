" Basic
set shell=/bin/zsh
set encoding=utf-8
set ignorecase
set nocompatible " Disable vim weirdness
set hidden
set ruler 
set ttyfast
set lazyredraw " https://github.com/vim/vim/issues/1735#issuecomment-383353563
set timeoutlen=300 " http://stackoverflow.com/questions/2158516/delay-before-o-opens-a-new-line
set shortmess+=c
set path+=** " filenames in directories directly

filetype plugin indent on

" Editor settings
set re=0
set autoindent
set ai
set foldlevel=99 " open all folds
" use the system clipboard by default
set clipboard=unnamed
set smartindent
set expandtab
set tabstop=4
set shiftwidth=4
set softtabstop=4
set number " Line number 
set rnu " Line number relative to current position 
set laststatus=2
set noshowmode
set mouse=a " Mouse to click and scroll
set noshowmatch
set printfont=:h10
set printencoding=utf-8
set printoptions=paper:a4
" allow backspace in insert mode
set backspace=indent,eol,start
set completeopt-=preview " no scratch buffer when getting autocomplete
set signcolumn=yes

" Wildmenu
set wildmenu
set wildmode=list:longest
set wildignore=.hg,.svn,*~,*.png,*.jpg,*.gif,*.settings,Thumbs.db,*.min.js,*.swp,publish/*,intermediate/*,*.o,*.hi,Zend,vendor

" Proper search
set incsearch
set ignorecase
set smartcase
" (g search) option on by default
set gdefault

" Sane splits
set splitright
set splitbelow

" Permanent undo
set undodir=~/.vimdid
set undofile

" Help filetype detection
autocmd BufRead *.plot set filetype=gnuplot
autocmd BufRead *.md set filetype=markdown
autocmd BufRead *.lds set filetype=ld
autocmd BufRead *.tex set filetype=tex
autocmd BufRead *.trm set filetype=c
autocmd BufRead *.xlsx.axlsx set filetype=ruby
