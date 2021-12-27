" ** NEOVIM INIT SCRIPT **
" Neovim should be installed, as well as vim-plug (https://github.com/junegunn/vim-plug)
" (vim-plug is used as the dependency manager)

source $HOME/.config/nvim/plugins.vim
source $HOME/.config/nvim/colors.vim
source $HOME/.config/nvim/bindings.vim
luafile $HOME/.config/nvim/settings.lua
luafile $HOME/.config/nvim/completion.lua
luafile $HOME/.config/nvim/tree-sitter-init.lua
luafile $HOME/.config/nvim/lsp-init.lua
luafile $HOME/.config/nvim/todo-init.lua
luafile $HOME/.config/nvim/nvim-tree.lua

""""""""""""""""""""""""""""""""""""""""
" # Misc configurations

" Help filetype detection
autocmd BufRead *.plot set filetype=gnuplot
autocmd BufRead *.md set filetype=markdown
autocmd BufRead *.lds set filetype=ld
autocmd BufRead *.tex set filetype=tex
autocmd BufRead *.trm set filetype=c
autocmd BufRead *.xlsx.axlsx set filetype=ruby

nnoremap <silent> <C-n> :NvimTreeToggle<CR>
nnoremap <silent> <leader>r :NvimTreeRefresh<CR>

" ## Color Scheme
nnoremap <silent> <leader><CR> :colorscheme base16-one-light<CR>
nnoremap <silent> <leader><CR><CR> :colorscheme base16-woodland<CR>

" ### Vim Rooter
let g:rooter_manual_only = 1

" ### Firebase
let g:vim_firestore_warnings = 0

" ### Vim-Rainbow
let g:rainbow_active = 0 " toggle via :RainbowToggle

" ### Lightline
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
    " https://stackoverflow.com/a/45244610/3261161
    return expand('%:p') !=# '' ? expand('%:~:.') : '[Untitled]'
endfunction

function! LinterStatus() abort
    " uses lsp-status.nvim to get the status
    if luaeval('#vim.lsp.buf_get_clients() > 0')
        return luaeval("require('lsp-status').status()")
    endif

    return ''
endfunction

" ### JavaScript
let javaScript_fold=0
autocmd BufReadPost .eslintrc setlocal filetype=json
autocmd BufReadPost .prettierrc setlocal filetype=json
