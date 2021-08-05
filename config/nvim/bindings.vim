" # Notes to self
" nnoremap = normal mode, non-recursive remap
" vnoremap = visual mode, non-recursive remap
" inoremap = insertion mode, non-recursive remap
" etc. for the other modes -> just use non-recursive mappings or weird things
" could happen

" Note that some invokations of <CR> may need to call <Plug>delimitMateCR
" instead. This is so that delimitMate is still able to format if need be.

let mapleader = "\<Space>"
nnoremap <Leader>` :echo "You got it :^)"<CR>

" ; as : in normal mode
nnoremap ; :

" Quick-save
nmap <leader>w :w<CR>
nmap <leader>q :wq<CR>

" Highlight disable (doesn't disable automatically after a search)
nmap <silent> <leader>n :noh<CR>

" Close buffer, not window
" Use the command Bd or <leader> control b to close the current buffer without
" losing the split screen window
command Bd :bp | :bd #
nnoremap <leader><C-b> :Bd<CR>

" <leader><leader> toggles between buffers
nnoremap <leader><leader> <c-^>
" <leader>, shows/hides hidden characters
nnoremap <leader>, :set invlist<cr>
" <leader>q shows stats
nnoremap <leader>q g<c-g>
" Keymap for replacing up to next _ or -
noremap <leader>m ct_

" Faster fuzzy searching
" GFiles = (only search git files, ignore things in .gitignore)
nmap <leader>; :GFiles<CR> 
nmap <leader>' :Buffers<CR>
nmap <leader>\ :Rg<CR>

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

" In normal mode, use jk to exit.
inoremap jk <Esc>

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

" alt + hjkl to resize windows
nnoremap <M-j> :resize -2<CR>
nnoremap <M-k> :resize +2<CR>
nnoremap <M-h> :vertical resize -2<CR>
nnoremap <M-l> :vertical resize +2<CR>

if has('nvim')
    set guicursor=n-v-c:block-Cursor/lCursor-blinkon0,i-ci:ver25-Cursor/lCursor,r-cr:hor20-Cursor/lCursor
    set inccommand=nosplit
    noremap <C-q> :confirm qall<CR>
end

" CTRL-C doesn't trigger the InsertLeave autocmd . map to <ESC> instead.
inoremap <c-c> <ESC>
