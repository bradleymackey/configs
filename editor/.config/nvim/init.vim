" ** NEOVIM INIT SCRIPT **
" Neovim should be installed, as well as vim-plug (https://github.com/junegunn/vim-plug)
" (vim-plug is used as the dependency manager)

" # Notes to self
" nnoremap = normal mode, non-recursive remap
" vnoremap = visual mode, non-recursive remap
" inoremap = insertion mode, non-recursive remap
" etc. for the other modes -> just use non-recursive mappings or weird things
" could happen

" Leader
let mapleader = "\<Space>"
nnoremap <Leader>` :echo "This is a test of the leader key mapping"<CR>
nnoremap <Leader><Leader> :bp<CR> 

" Plugins
call plug#begin('~/.local/share/nvim/plugged')
Plug 'chriskempson/base16-vim'
Plug 'scrooloose/nerdtree'
"Plug 'tsony-tsonev/nerdtree-git-plugin'
Plug 'Xuyuanp/nerdtree-git-plugin'
Plug 'tiagofumo/vim-nerdtree-syntax-highlight'
Plug 'airblade/vim-gitgutter'
" Autocomplete, language server and other plugin support (like bracket
" autocomplete, see below for all listed plugins and config)
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'itchyny/lightline.vim'
Plug 'rust-lang/rust.vim'
Plug 'keith/swift.vim'
" error checking, syntax checking
Plug 'w0rp/ale'
" Highlight what is about to be yanked
Plug 'machakann/vim-highlightedyank'
" Fuzzy
Plug 'airblade/vim-rooter'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'luochen1990/rainbow'
" Xcode
" (they call the master branch 'main')
Plug 'gfontenot/vim-xcode', {'branch': 'main'}
call plug#end()

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
au VimLeave * set guicursor=a:hor20-blinkon0

" APPEARANCE/BASIC
set ignorecase
set shell=/bin/zsh
set nocompatible " Disable vim weirdness
set hidden
set ruler 
set ttyfast
set lazyredraw " https://github.com/vim/vim/issues/1735#issuecomment-383353563
set timeoutlen=300 " http://stackoverflow.com/questions/2158516/delay-before-o-opens-a-new-line
filetype plugin indent on

" Faster fuzzy searching
nmap <leader>; :Files<CR>
nmap <leader>' :Buffers<CR>
nmap <leader>\ :Rg<CR>
" Quick-save
nmap <leader>w :w<CR>
nmap <leader>q :wq<CR>
" Highlight disable (doesn't disable automatically after a search)
nmap <leader>n :noh<CR>
" Position Cursor
nnoremap <leader>z zz<CR>
" Autocomplete select
inoremap <expr> <TAB> pumvisible() ? "\<C-y>" : "\<CR>"
inoremap <expr> <Esc> pumvisible() ? "\<C-e>" : "\<Esc>"
inoremap <expr> <C-j> pumvisible() ? "\<C-n>" : "\<Down>"
inoremap <expr> <C-k> pumvisible() ? "\<C-p>" : "\<Up>"
" Close buffer, not window
" Use the command Bd or <leader> control b to close the current buffer without
" losing the split screen window
command Bd :bp | :bd #
nnoremap <leader><C-b> :Bd<CR>

" Editor settings
set autoindent
set encoding=utf-8
set expandtab
set tabstop=4
set shiftwidth=4
set softtabstop=4
set number " Line number 
set rnu " Line number relative to current position 
set laststatus=2
set noshowmode
set wildmenu
set mouse=a " Mouse to click and scroll
set noshowmatch
set printfont=:h10
set printencoding=utf-8
set printoptions=paper:a4

" Proper search
set incsearch
set ignorecase
set smartcase
set gdefault

" Ctrl-C or Ctrl-J for Esc (because ESC is a pain in the ass on touchbar)
inoremap <C-j> <Esc>
vnoremap <C-j> <Esc>
inoremap <C-c> <Esc>
vnoremap <C-c> <Esc>

" Forced learning is good! Unmap arrow keys so that we are forced to use the
" homerow.
nnoremap <up> <nop>
nnoremap <down> <nop>
inoremap <up> <nop>
inoremap <down> <nop>
inoremap <left> <nop>
inoremap <right> <nop>

" Left and right can switch buffers
nnoremap <left> :bp<CR>
nnoremap <right> :bn<CR>
nnoremap <leader><left> <c-w><left><CR>
nnoremap <leader><right> <c-w><right><CR>

" Move by line
nnoremap j gj
nnoremap k gk

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

" Vim-Rainbow
let g:rainbow_active = 1 "set to 0 if you want to enable it later via :RainbowToggle

" *** Color OVERRIDES ***
" Note that these overrides are set based on the 'desert' color scheme
" (We are just overriding some of the colors)
syntax on
set hlsearch
set background=dark
colorscheme desert
set t_Co=256
hi Normal ctermbg=NONE
" Line numbers/line number background
hi LineNr ctermfg=243 ctermbg=238 guibg=grey
hi CursorLineNR cterm=bold ctermfg=white ctermbg=238
" (the gutter, same as LineNr)
hi SignColumn ctermfg=243 ctermbg=238 guibg=grey
hi StatusLine cterm=bold,reverse ctermbg=8 guifg=black guibg=red
" The autocomplete box
hi Pmenu ctermfg=white ctermbg=239 guibg=239
hi PmenuSel ctermfg=yellow ctermbg=black guibg=black
" 170 = Orchid -- this makes keywords not too dark pink (which is hard to read
" on a dark background)
hi Special ctermfg=185
" PreProc is basically keywords
hi PreProc ctermfg=169
hi Comment ctermfg=gray cterm=italic gui=italic
hi SpecialComment ctermfg=70 cterm=italic gui=italic
hi Identifier ctermfg=147 cterm=NONE
hi Search ctermbg=white ctermfg=black
hi IncSearch ctermbg=blue ctermfg=white
hi MatchParen ctermbg=None ctermfg=yellow cterm=bold,undercurl,strikethrough
" Error is too red, so we make it salmon
hi CocErrorSign ctermfg=213

" NERDTree
let g:NERDTreeGitStatusWithFlags = 1
" (open NERDTree when we open a directory)
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0] | wincmd p | ene | exe 'cd '.argv()[0] | endif
" Open and close the tree
nnoremap <Leader><c-f> :NERDTreeToggle<CR>
" Faster searching
nnoremap <silent> <Leader>v :NERDTreeFind<CR>
" Appearance
let NERDTreeMinimalUI = 1
let NERDTreeDirArrows = 1

" vim-prettier
"let g:prettier#quickfix_enabled = 0
"let g:prettier#quickfix_auto_focus = 0
" prettier command for coc
" run prettier on save
"let g:prettier#autoformat = 0
"autocmd BufWritePre *.js,*.jsx,*.mjs,*.ts,*.tsx,*.css,*.less,*.scss,*.json,*.graphql,*.md,*.vue,*.yaml,*.html PrettierAsync

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

" don't give |ins-completion-menu| messages.
set shortmess+=c
" always show signcolumns
set signcolumn=yes

inoremap <expr><S-TAB> pumvisible() ? "\<C-p>" : "\<C-h>"

function! s:check_back_space() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction

" Use <cr> to confirm completion, `<C-g>u` means break undo chain at current position.
" Coc only does snippet and additional edit on confirm.
inoremap <expr> <cr> pumvisible() ? "\<C-y>" : "\<C-g>u\<CR>"
" Or use `complete_info` if your vim support it, like:
" inoremap <expr> <cr> complete_info()["selected"] != "-1" ? "\<C-y>" : "\<C-g>u\<CR>"

" Use K to show documentation in preview window
nnoremap <silent> K :call <SID>show_documentation()<CR>

" Autocomplete
let g:deoplete#enable_at_startup = 1
" Select an item from autocomplete list without inserting a line break
augroup DepoleteLeximaWorkaround
  au!
  autocmd VimEnter * let a = maparg('<CR>', 'i') | inoremap <expr> <CR> pumvisible() ? "\<C-y>" : eval(a)
augroup END

let g:NERDTreeIgnore = ['^node_modules$']

" Maps K to hover, gd to goto definition, rn to rename
" nnoremap <silent> K :call LanguageClient_textDocument_hover()
" nnoremap <silent> gd :call LanguageClient_textDocument_definition()
" nnoremap <silent> rn :call LanguageClient_textDocument_rename()

set completeopt-=preview " no scratch buffer when getting autocomplete
" Make the box gray rather than bright pink

" Rust config
let g:rustfmt_autosave = 1
autocmd BufReadPost *.rs setlocal filetype=rust

" Autocomplete Config
" suppress the annoying 'match x of y', 'The only match' and 'Pattern not
" found' messages
set shortmess+=c
" CTRL-C doesn't trigger the InsertLeave autocmd . map to <ESC> instead.
inoremap <c-c> <ESC>
" When the <Enter> key is pressed while the popup menu is visible, it only
" hides the menu. Use this mapping to close the menu and also start a new
" line.
inoremap <expr> <CR> (pumvisible() ? "\<c-y>\<cr>" : "\<CR>")
" Use <TAB> to select the popup menu:
inoremap <expr> <Tab> pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"

" ALE config
" (Currently disabled)
let g:ale_lint_on_enter = 0
let g:ale_lint_on_text_changed = 0
let g:ale_lint_on_save = 0

" Lightline
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
  return expand('%:t') !=# '' ? @% : '[No Name]'
endfunction
" Use auocmd to force lightline update.
autocmd User CocStatusChange,CocDiagnosticChange call lightline#update()

" COC
" coc config
let g:coc_global_extensions = [
  \ 'coc-snippets',
  \ 'coc-pairs',
  \ 'coc-tsserver',
  \ 'coc-eslint', 
  \ 'coc-prettier', 
  \ 'coc-json', 
  \ ]
" Crtl + e to jump out of the brackets auto-completing brackets
inoremap <expr><C-e> pumvisible() ? "\<C-e>" : "\<End>"
" lifetimes don't need completion
autocmd FileType rust let b:coc_pairs_disabled = ["'"]

" don't give |ins-completion-menu| messages.
set shortmess+=c
" always show signcolumns
set signcolumn=yes

" Use tab for trigger completion with characters ahead and navigate.
" Use command ':verbose imap <tab>' to make sure tab is not mapped by other plugin.
inoremap <silent><expr> <TAB>
      \ pumvisible() ? "\<C-n>" :
      \ <SID>check_back_space() ? "\<TAB>" :
      \ coc#refresh()
inoremap <expr><S-TAB> pumvisible() ? "\<C-p>" : "\<C-h>"

function! s:check_back_space() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction

" Use <c-space> to trigger completion.
inoremap <silent><expr> <c-space> coc#refresh()

" Use <cr> to confirm completion, `<C-g>u` means break undo chain at current position.
" Coc only does snippet and additional edit on confirm.
inoremap <expr> <cr> pumvisible() ? "\<C-y>" : "\<C-g>u\<CR>"
" Or use `complete_info` if your vim support it, like:
" inoremap <expr> <cr> complete_info()["selected"] != "-1" ? "\<C-y>" : "\<C-g>u\<CR>"

" Use `[g` and `]g` to navigate diagnostics
nmap <silent> [g <Plug>(coc-diagnostic-prev)
nmap <silent> ]g <Plug>(coc-diagnostic-next)

" Remap keys for gotos
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

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
