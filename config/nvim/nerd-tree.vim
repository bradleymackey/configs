" Open and close the tree
nnoremap <c-n> :NERDTreeToggle<CR>

" Faster searching
nnoremap <silent> <Leader>v :NERDTreeFind<CR>

hi NERDTreeDir guifg=#04a03d guibg=NONE gui=bold

let g:NERDTreeGitStatusWithFlags = 1
let NERDTreeAutoDeleteBuffer = 1
let g:NERDTreeIgnore = ['^node_modules$', '^__pycache__', '.DS_Store']

" (open NERDTree when we open a directory)
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0] | wincmd p | ene | exe 'cd '.argv()[0] | endif

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
