" ** NEOVIM INIT SCRIPT **
" Neovim should be installed, as well as vim-plug (https://github.com/junegunn/vim-plug)
" (vim-plug is used as the dependency manager)
"
" Note that some invokations of <CR> may need to call <Plug>delimitMateCR
" instead. This is so that delimitMate is still able to format if need be.
set shell=/bin/zsh
set encoding=utf-8
let mapleader = "\<Space>"

" # Notes to self
" nnoremap = normal mode, non-recursive remap
" vnoremap = visual mode, non-recursive remap
" inoremap = insertion mode, non-recursive remap
" etc. for the other modes -> just use non-recursive mappings or weird things
" could happen

" Leader
nnoremap <Leader>` :echo "Leader active, bindings present :^)"<CR>

""""""""""""""""""""""""""""""""""""""""

" Faster fuzzy searching
" GFiles = (only search git files, ignore things in .gitignore)
nmap <leader>; :GFiles<CR> 
nmap <leader>' :Buffers<CR>
nmap <leader>\ :Rg<CR>
" Quick-save
nmap <leader>w :w<CR>
nmap <leader>q :wq<CR>
" Highlight disable (doesn't disable automatically after a search)
nmap <silent> <leader>n :noh<CR>
" Position Cursor
nnoremap <leader>z zz<CR>
" Close buffer, not window
" Use the command Bd or <leader> control b to close the current buffer without
" losing the split screen window
command Bd :bp | :bd #
nnoremap <leader><C-b> :Bd<CR>

""""""""""""""""""""""""""""""""""""""""

" <leader><leader> toggles between buffers
nnoremap <leader><leader> <c-^>
" <leader>, shows/hides hidden characters
nnoremap <leader>, :set invlist<cr>
" <leader>q shows stats
nnoremap <leader>q g<c-g>
" Keymap for replacing up to next _ or -
noremap <leader>m ct_

""""""""""""""""""""""""""""""""""""""""
" Install vim-plug if it does not exist
if empty(glob('~/.vim/autoload/plug.vim'))
  silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs
    \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
  autocmd VimEnter * PlugInstall --sync | source $MYVIMRC
endif

" No LSP in ALE!
" nvim-lsp handles this, but routes it to ALE for display
let g:ale_disable_lsp = 1

" Plugins
call plug#begin('~/.local/share/nvim/plugged')

" LSP
Plug 'neovim/nvim-lspconfig'
Plug 'nvim-lua/completion-nvim'
Plug 'dense-analysis/ale'
Plug 'nathunsmitty/nvim-ale-diagnostic'

" Fuzzy
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

" GUI
Plug 'luochen1990/rainbow'
Plug 'itchyny/lightline.vim'
Plug 'chriskempson/base16-vim'
Plug 'preservim/nerdtree'
Plug 'airblade/vim-gitgutter'

" Editor
" 'gcc' to comment line, 'gc' if in visual mode
Plug 'tomtom/tcomment_vim'
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
Plug 'airblade/vim-rooter'
Plug 'godlygeek/tabular'
" better than coc-pairs
" recursive <cr> maps should RECURSIVELY call `<Plug>delimitMateCR` in order
" to make sure that the correct delimiting calls are made
Plug 'Raimondi/delimitMate'

" Syntax
Plug 'delphinus/vim-firestore' " firebase *.rules file support
Plug 'digitaltoad/vim-pug'
Plug 'keith/swift.vim'
call plug#end()

""""""""""""""""""""""""""""""""""""""""

" *** Color & Highlighting ***
syntax on
set cursorline
set hlsearch
set t_Co=256
set background=dark
let base16colorspace=256
" so that colors work correctly
set termguicolors

if filereadable(expand("~/.vimrc_background"))
  let base16colorspace=256
  source ~/.vimrc_background
endif

colorscheme base16-gruvbox-dark-hard
hi Normal ctermbg=NONE

" Brighter comments
call g:Base16hi("Comment", "737571", "", "737571", "", "", "")
call g:Base16hi("MatchParen", g:base16_gui05, g:base16_gui03, g:base16_cterm05, g:base16_cterm03, "bold,italic", "")

""""""""""""""""""""""""""""""""""""""""

" *** Treesitter ***
luafile ~/.config/nvim/tree-sitter-init.lua

""""""""""""""""""""""""""""""""""""""""
" LSP

" gets the color of an existing group name
" from https://github.com/vim-airline/vim-airline/blob/master/autoload/airline/highlighter.vim
function! s:get_syn(group, what, mode) abort
  let color = ''
  if hlexists(a:group)
    let color = synIDattr(synIDtrans(hlID(a:group)), a:what, a:mode)
  endif
  if empty(color) || color == -1
    " should always exist
    let color = synIDattr(synIDtrans(hlID('Normal')), a:what, a:mode)
    " however, just in case
    if empty(color) || color == -1
      let color = 'NONE'
    endif
  endif
  return color
endfunction

" Colors
" :help highlight-groups
" (Set LSP colors based on the current colorscheme, but italic and underline
" them to make them more clear

" LEGACY - we now use ALE to render the errors
" This is because it integrates easily with linters and auto-formatters as
" well, so we just use it to display the LSP errors too.
" (still using native LSP)

" let s:lsp_tf='italic,underline'
"
" exec 'hi LspDiagnosticsVirtualTextError cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
"             \' guibg=NONE' .
"             \' guifg=' . s:get_syn('ErrorMsg', 'fg', 'gui') .
"             \' ctermbg=NONE' .
"             \' ctermfg=' . s:get_syn('ErrorMsg', 'fg', 'cterm')
"
" exec 'hi LspDiagnosticsVirtualTextWarning cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
"             \' guibg=NONE' .
"             \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
"             \' ctermbg=NONE' .
"             \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')
"
" exec 'hi LspDiagnosticsVirtualTextHint cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
"             \' guibg=NONE' .
"             \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
"             \' ctermbg=NONE' .
"             \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')
"
" exec 'hi LspDiagnosticsVirtualTextInformation cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
"             \' guibg=NONE' .
"             \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
"             \' ctermbg=NONE' .
"             \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')
"


" sign define LspDiagnosticsSignInformation text=@ texthl=Label linehl= numhl=Label
" sign define LspDiagnosticsSignHint text=> texthl=Label linehl= numhl=Label
" sign define LspDiagnosticsSignWarning text=* texthl=Label linehl= numhl=Label
" sign define LspDiagnosticsSignError text=! texthl=Error linehl= numhl=Error

" LSP Config 
luafile ~/.config/nvim/lsp-init.lua

" Autocomplete
set completeopt=menuone,noinsert,noselect
let g:completion_matching_strategy_list = ['exact', 'substring', 'fuzzy']
imap <silent> <c-p> <Plug>(completion_trigger)

" Format and Lint with ALE
let g:ale_fixers = ['prettier', 'eslint']
let g:ale_fix_on_save = 1
let g:ale_virtualtext_cursor = 1
let g:ale_virtualtext_prefix = '    > '

hi link ALEVirtualTextError Comment
hi link ALEVirtualTextWarning Comment
hi link ALEVirtualTextInfo Comment

let g:ale_sign_error = '!'
let g:ale_sign_warning = '*'
sign define ALEErrorSign text= texthl=Error linehl= numhl=Error

" ALE doesn't override these -> we need them for the fixit box
hi link LspDiagnosticsFloatingError WarningMsg
hi link LspDiagnosticsFloatingWarning Label
hi link LspDiagnosticsFloatingHint Label
hi link LspDiagnosticsFloatingInformation Label

""""""""""""""""""""""""""""""""""""""""

" ## VIM ROOTER ##
" Manual only
let g:rooter_manual_only = 1

" ## GIT GUTTER ##
" Update git status when the buffer is saved
autocmd BufWritePost * GitGutter
" lower priority on the gutter makes sure it's below the LSP
" (LSP should override gutter in display)
let g:gitgutter_sign_priority=9

" ## FIREBASE ##
let g:vim_firestore_warnings = 0

" APPEARANCE/BASIC
set ignorecase
set nocompatible " Disable vim weirdness
set hidden
set ruler 
set ttyfast
set lazyredraw " https://github.com/vim/vim/issues/1735#issuecomment-383353563
set timeoutlen=300 " http://stackoverflow.com/questions/2158516/delay-before-o-opens-a-new-line
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

" ; as : in normal mode
nnoremap ; :

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

" Forced learning is good! Unmap arrow keys so that we are forced to use the
" homerow.
nnoremap <up> <nop>
nnoremap <down> <nop>
inoremap <up> <nop>
inoremap <down> <nop>
inoremap <left> <nop>
inoremap <right> <nop>

" Move with Ctrl HORIZONTALLY
inoremap <C-h> <left>
nnoremap <C-h> <left>
inoremap <C-l> <right>
nnoremap <C-l> <right>

" Left and right can switch buffers
nnoremap <left> :bp<CR>
nnoremap <right> :bn<CR>
nnoremap <leader><left> <c-w><left><CR>
nnoremap <leader><right> <c-w><right><CR>

" Move by line
nnoremap j gj
nnoremap k gk

" Sane splits
set splitright
set splitbelow

" Permanent undo
set undodir=~/.vimdid
set undofile

set signcolumn=yes

" Leader +- to adjust window sizing
nnoremap <silent> <Leader>1 :exe "resize " . (winheight(0) * 3/2)<CR>
nnoremap <silent> <Leader>2 :exe "resize " . (winheight(0) * 2/3)<CR>
nnoremap <silent> <Leader>3 :exe "resize " . (winwidth(0) * 3/2)<CR>
nnoremap <silent> <Leader>4 :exe "resize " . (winwidth(0) * 2/3)<CR>

if has('nvim')
    set guicursor=n-v-c:block-Cursor/lCursor-blinkon0,i-ci:ver25-Cursor/lCursor,r-cr:hor20-Cursor/lCursor
    set inccommand=nosplit
    noremap <C-q> :confirm qall<CR>
end

" Help filetype detection
autocmd BufRead *.plot set filetype=gnuplot
autocmd BufRead *.md set filetype=markdown
autocmd BufRead *.lds set filetype=ld
autocmd BufRead *.tex set filetype=tex
autocmd BufRead *.trm set filetype=c
autocmd BufRead *.xlsx.axlsx set filetype=ruby

" Vim-Rainbow
let g:rainbow_active = 0 " toggle via :RainbowToggle

" --- NERDTREE ---
hi NERDTreeDir guifg=#04a03d guibg=NONE gui=bold
let g:NERDTreeGitStatusWithFlags = 1
let NERDTreeAutoDeleteBuffer = 1
let g:NERDTreeIgnore = ['^node_modules$', '^__pycache__', '.DS_Store']
" (open NERDTree when we open a directory)
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0] | wincmd p | ene | exe 'cd '.argv()[0] | endif
" Open and close the tree
nnoremap <c-n> :NERDTreeToggle<CR>
" Faster searching
nnoremap <silent> <Leader>v :NERDTreeFind<CR>
" Appearance
let NERDTreeMinimalUI = 1
let NERDTreeDirArrows = 1
let NERDTreeShowHidden = 1 " some may be ignored, see above

" sync open file with NERDTree
" Check if NERDTree is open or active
function! IsNERDTreeOpen()        
  return exists("t:NERDTreeBufName") && (bufwinnr(t:NERDTreeBufName) != -1)
endfunction

" Call NERDTreeFind iff NERDTree is active, current window contains a modifiable
" file, and we're not in vimdiff
function! SyncTree()
  if &modifiable && IsNERDTreeOpen() && strlen(expand('%')) > 0 && !&diff
    NERDTreeFind
    wincmd p
  endif
endfunction

" Highlight currently open buffer in NERDTree
autocmd BufEnter * call SyncTree()

function! s:check_back_space() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction

" COMPLETION SUGGESTIONS
" Use <cr> to confirm completion (we use delimitMateCR to we also get this <cr> formatting), `<C-g>u` means break undo chain at current position.
" Coc only does snippet and additional edit on confirm.
imap <expr> <cr> pumvisible() ? "\<C-y>" : "\<C-g>u\<Plug>delimitMateCR"
" Or use `complete_info` if your vim support it, like:
imap <expr> <cr> complete_info()["selected"] != "-1" ? "\<C-y>" : "\<C-g>u\<Plug>delimitMateCR"
" Use <TAB> to select the popup menu:
inoremap <expr> <Tab> pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"

" Use K to show documentation in preview window
nnoremap <silent> K :call <SID>show_documentation()<CR>

" RUST
let g:rustfmt_autosave = 1
autocmd BufReadPost *.rs setlocal filetype=rust

" Autocomplete Config
" suppress the annoying 'match x of y', 'The only match' and 'Pattern not
" found' messages
set shortmess+=c
" CTRL-C doesn't trigger the InsertLeave autocmd . map to <ESC> instead.
inoremap <c-c> <ESC>

" ------- Lightline -------
let g:lightline = {
      \ 'active': {
      \   'left': [ [ 'mode', 'paste' ],
      \             [ 'readonly', 'filename', 'modified', 'lspstatus' ] ]
      \ },
      \ 'component_function': {
      \   'filename': 'LightlineFilename',
      \   'lspstatus': 'LinterStatus',
      \ },
      \ }
function! LightlineFilename()
    " if the path is empty, show 'noname'
    " otherwise show file relative to open directory
    return expand('%:p') !=# '' ? expand('%:t') : '[No Name]'
endfunction

function! LinterStatus() abort
    let l:counts = ale#statusline#Count(bufnr(''))

    let l:all_errors = l:counts.error + l:counts.style_error
    let l:all_non_errors = l:counts.total - l:all_errors

    return l:counts.total == 0 ? 'OK' : printf(
    \   '%dE %dW',
    \   all_errors,
    \   all_non_errors
    \)
endfunction

" ###### JavaScript #######
let javaScript_fold=0

" ####### DelimitMate ########

" delimitMate (better than coc-pairs)
let g:delimitMate_expand_cr = 2
let g:delimitMate_expand_space = 1
let g:delimitMate_matchpairs = "(:),[:],{:}"
" no quote completion
let delimitMate_quotes = ""
autocmd FileType vim,html let b:delimitMate_matchpairs = "(:),[:],{:},<:>"
