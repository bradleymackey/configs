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
nnoremap <Leader>` :echo "LEADER ACKNOWLEDGED :)"<CR>

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

" Plugins
call plug#begin('~/.local/share/nvim/plugged')
Plug 'chriskempson/base16-vim'
Plug 'ms-jpq/chadtree', {'branch': 'chad', 'do': 'python3 -m chadtree deps'}
Plug 'ryanoasis/vim-devicons'
Plug 'airblade/vim-gitgutter'
" Autocomplete, language server and other plugin support (like bracket
" autocomplete, see below for all listed plugins and config)
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'itchyny/lightline.vim'
Plug 'rust-lang/rust.vim'
Plug 'keith/swift.vim'
Plug 'godlygeek/tabular'
" Fuzzy
Plug 'airblade/vim-rooter'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'luochen1990/rainbow'
" 'gcc' to comment line, 'gc' if in visual mode
Plug 'tomtom/tcomment_vim'
" Firebase *.rules file support
Plug 'delphinus/vim-firestore'
" better than coc-pairs
" recursive <cr> maps should RECURSIVELY call `<Plug>delimitMateCR` in order
" to make sure that the correct delimiting calls are made
Plug 'Raimondi/delimitMate'
" Xcode
" (they call the master branch 'main')
Plug 'gfontenot/vim-xcode', {'branch': 'main'}
Plug 'leafgarland/typescript-vim'
Plug 'digitaltoad/vim-pug'
call plug#end()

""""""""""""""""""""""""""""""""""""""""

" ## FIREBASE ##
let g:vim_firestore_warnings = 0

" ## Xcode ##
" :Xbuild will build the project
" :Xrun will run the app in the iOS Simulator or locally on your Mac
" :Xtest will test the project
" :Xclean will clean the project's build directory
" :Xopen will open the project or a specified file in Xcode
" :Xswitch will switch the selected version of Xcode (requires sudo)
" :Xworkspace will let you manually specify the workspace
" :Xproject will let you manually specify the project
" :Xscheme will let you manually specify the scheme
" :Xsimulator will let you manually specify the simulator
let g:xcode_default_simulator = 'iPhone 8'

" Re-enable underscore regular terminal cursor when we leave nvim
" (otherwise the nvim cursor style is carried over to the term)
autocmd VimLeave * set guicursor=a:hor20-blinkon0

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
call g:Base16hi("Comment", "77b32e", "", "77b32e", "", "italic", "")
call g:Base16hi("MatchParen", g:base16_gui05, g:base16_gui03, g:base16_cterm05, g:base16_cterm03, "bold,italic", "")

" COC defines bad colors, link them to the scheme default
hi link CocErrorSign Error
hi link CocWarningSign Warning

" Reference: Coc Default Colors
" hi default CocUnderline    cterm=underline gui=underline
" hi default CocBold         term=bold cterm=bold gui=bold
" hi default CocErrorSign    ctermfg=Red     guifg=#ff0000
" hi default CocWarningSign  ctermfg=Brown   guifg=#ff922b
" hi default CocInfoSign     ctermfg=Yellow  guifg=#fab005
" hi default CocHintSign     ctermfg=Blue    guifg=#15aabf
" hi default CocSelectedText ctermfg=Red     guifg=#fb4934
" hi default CocCodeLens     ctermfg=Gray    guifg=#999999

" ------- CHADTree (better than NERDTree) --------
nnoremap <c-n> <cmd>CHADopen<cr>
let g:chadtree_settings = { "theme.icon_glyph_set": "ascii" }

" old NERDTree config:
" let g:NERDTreeGitStatusWithFlags = 1
" let g:NERDTreeIgnore = ['^node_modules$', '^__pycache__', '.DS_Store']
" " (open NERDTree when we open a directory)
" autocmd StdinReadPre * let s:std_in=1
" autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0] | wincmd p | ene | exe 'cd '.argv()[0] | endif
" " Open and close the tree
" nnoremap <c-n> :NERDTreeToggle<CR>
" " Faster searching
" nnoremap <silent> <Leader>v :NERDTreeFind<CR>
" " Appearance
" let NERDTreeMinimalUI = 1
" let NERDTreeDirArrows = 1
" let NERDTreeShowHidden=1 " some may be ignored, see above

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
      \             [ 'cocstatus', 'readonly', 'filename', 'modified' ] ]
      \ },
      \ 'component_function': {
      \   'filename': 'LightlineFilename',
      \   'cocstatus': 'coc#status'
      \ },
      \ }
function! LightlineFilename()
    " if the path is empty, show 'noname'
    " otherwise show file relative to open directory
    return expand('%:p') !=# '' ? expand('%:t') : '[No Name]'
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

" ######## COC ########

" coc config
let g:coc_global_extensions = [
  \ 'coc-snippets',
  \ 'coc-tsserver',
  \ 'coc-eslint', 
  \ 'coc-prettier',
  \ 'coc-json', 
  \ 'coc-python',
  \ 'coc-rls',
  \ ]
" prettier formatting with COC
command! -nargs=0 Prettier :CocCommand prettier.formatFile
" Use auocmd to force lightline update.
autocmd User CocStatusChange,CocDiagnosticChange call lightline#update()

" Use tab for trigger completion with characters ahead and navigate.
" Use command ':verbose imap <tab>' to make sure tab is not mapped by other plugin.
inoremap <silent><expr> <TAB>
      \ pumvisible() ? "\<C-n>" :
      \ <SID>check_back_space() ? "\<TAB>" :
      \ coc#refresh()

function! s:check_back_space() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction

" Use <c-space> to trigger completion.
inoremap <silent><expr> <c-space> coc#refresh()

" Use `[g` and `]g` to navigate diagnostics
nmap <silent> [g <Plug>(coc-diagnostic-prev)
nmap <silent> ]g <Plug>(coc-diagnostic-next)

" Remap keys for gotos
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)
nmap <silent> <leader>m <Plug>(coc-float-hide)

" Use K to show documentation in preview window
nnoremap <silent> K :call <SID>show_documentation()<CR>
" Use M to rename a variable
nnoremap <silent> M :call CocAction('rename')<CR>

function! s:show_documentation()
  if (index(['vim','help'], &filetype) >= 0)
    execute 'h '.expand('<cword>')
  else
    call CocAction('doHover')
  endif
endfunction

" Highlight symbol under cursor on CursorHold
autocmd CursorHold * silent call CocActionAsync('highlight')

" Remap for format selected region
xmap <leader>f <Plug>(coc-format-selected)
nmap <leader>f <Plug>(coc-format-selected)

augroup mygroup
  autocmd!
  " Setup formatexpr specified filetype(s).
  autocmd FileType typescript,json setl formatexpr=CocAction('formatSelected')
  " Update signature help on jump placeholder
  autocmd User CocJumpPlaceholder call CocActionAsync('showSignatureHelp')
augroup end

" Remap for do codeAction of selected region, ex: `<leader>aap` for current paragraph
xmap <leader>a  <Plug>(coc-codeaction-selected)
nmap <leader>a  <Plug>(coc-codeaction-selected)

" Remap for do codeAction of current line
nmap <leader>ac  <Plug>(coc-codeaction)
" Fix autofix problem of current line
nmap <leader>qf  <Plug>(coc-fix-current)

" Create mappings for function text object, requires document symbols feature of languageserver.
xmap if <Plug>(coc-funcobj-i)
xmap af <Plug>(coc-funcobj-a)
omap if <Plug>(coc-funcobj-i)
omap af <Plug>(coc-funcobj-a)

" Use <C-d> for select selections ranges, needs server support, like: coc-tsserver, coc-python
nmap <silent> <C-d> <Plug>(coc-range-select)
xmap <silent> <C-d> <Plug>(coc-range-select)

" Use `:Format` to format current buffer
command! -nargs=0 Format :call CocAction('format')

" Use `:Fold` to fold current buffer
command! -nargs=? Fold :call     CocAction('fold', <f-args>)

" use `:OR` for organize import of current buffer
command! -nargs=0 OR   :call     CocAction('runCommand', 'editor.action.organizeImport')

" Add status line support, for integration with other plugin, checkout `:h coc-status`
set statusline^=%{coc#status()}%{get(b:,'coc_current_function','')}

" Using CocList
" Show all diagnostics
nnoremap <silent> <space>a  :<C-u>CocList diagnostics<cr>
" Manage extensions
nnoremap <silent> <space>e  :<C-u>CocList extensions<cr>
" Show commands
nnoremap <silent> <space>c  :<C-u>CocList commands<cr>
" Find symbol of current document
nnoremap <silent> <space>o  :<C-u>CocList outline<cr>
" Search workspace symbols
nnoremap <silent> <space>s  :<C-u>CocList -I symbols<cr>
" Do default action for next item.
nnoremap <silent> <space>j  :<C-u>CocNext<CR>
" Do default action for previous item.
nnoremap <silent> <space>k  :<C-u>CocPrev<CR>
" Resume latest coc list
nnoremap <silent> <space>p  :<C-u>CocListResume<CR>
