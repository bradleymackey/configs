" This is a simple .vimrc for use in places where
" I can't use nvim easily (such as on servers)
" It should be basic and fast, just adding a few things I like.

syntax on
set encoding=utf-8
set number
set rnu
set ttyfast
set hidden
set nocompatible
set clipboard=unnamed " System clipboard
set lazyredraw
set path+=**
set autoindent
set ai
set smartindent
set incsearch
set ignorecase
set smartcase
set tabstop=4
set shiftwidth=4
set softtabstop=4
set noshowmatch
" Sane splits
set splitright
set splitbelow

let mapleader = "\<Space>"

" Quick-save
nmap <leader>w :w<CR>
nmap <leader>q :wq<CR>

" Search results centered
nnoremap <silent> n nzz
nnoremap <silent> N Nzz
nnoremap <silent> * *zz
nnoremap <silent> # #zz
nnoremap <silent> g* g*zz

" Ctrl-C or Ctrl-J for Esc (because ESC is far away)
nnoremap <C-j> <Esc>
inoremap <C-j> <Esc>
vnoremap <C-j> <Esc>
snoremap <C-j> <Esc>
xnoremap <C-j> <Esc>
cnoremap <C-j> <Esc>
onoremap <C-j> <Esc>
lnoremap <C-j> <Esc>
tnoremap <C-j> <Esc>

nnoremap <C-c> <Esc>
inoremap <C-c> <Esc>
vnoremap <C-c> <Esc>
snoremap <C-c> <Esc>
xnoremap <C-c> <Esc>
cnoremap <C-c> <Esc>
onoremap <C-c> <Esc>
lnoremap <C-c> <Esc>
tnoremap <C-c> <Esc>

" Move with Ctrl HORIZONTALLY
inoremap <C-h> <left>
nnoremap <C-h> <left>
inoremap <C-l> <right>
nnoremap <C-l> <right>

" Move by line
nnoremap j gj
nnoremap k gk

" Highlight disable (doesn't disable automatically after a search)
nmap <silent> <leader>n :noh<CR>

" Save as root
command W :execute ':silent w !sudo tee % > /dev/null' | :edit!

autocmd BufRead *.plot set filetype=gnuplot
autocmd BufRead *.md set filetype=markdown
autocmd BufRead *.lds set filetype=ld
autocmd BufRead *.tex set filetype=tex
autocmd BufRead *.trm set filetype=c
autocmd BufRead *.xlsx.axlsx set filetype=ruby
