" ** NEOVIM INIT SCRIPT **
" Neovim should be installed, as well as vim-plug (https://github.com/junegunn/vim-plug)
" (vim-plug is used as the dependency manager)

source $HOME/.config/nvim/plugins.vim
source $HOME/.config/nvim/colors.vim
source $HOME/.config/nvim/bindings.vim
luafile $HOME/.config/nvim/tree-sitter-init.lua
source $HOME/.config/nvim/settings.vim
luafile ~/.config/nvim/lsp-init.lua
luafile ~/.config/nvim/todo-init.lua
luafile ~/.config/nvim/compe.lua

""""""""""""""""""""""""""""""""""""""""
" LSP (native LSP displays errors/warnings)
" Using EFM Langserver, it also can give linter messages

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

" Override some of the LSP default colors

let s:lsp_tf='italic,underline'

exec 'hi LspDiagnosticsVirtualTextError cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('ErrorMsg', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('ErrorMsg', 'fg', 'cterm')

exec 'hi LspDiagnosticsVirtualTextWarning cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')

exec 'hi LspDiagnosticsVirtualTextHint cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')

exec 'hi LspDiagnosticsVirtualTextInformation cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')

sign define LspDiagnosticsSignInformation text=@ texthl=Label linehl= numhl=Label
sign define LspDiagnosticsSignHint text=> texthl=Label linehl= numhl=Label
sign define LspDiagnosticsSignWarning text=* texthl=Label linehl= numhl=Label
sign define LspDiagnosticsSignError text=! texthl=Error linehl= numhl=Error

" LSP Config 

" Autocomplete
set completeopt=menuone,noinsert,noselect

inoremap <silent><expr> <C-Space> compe#complete()
inoremap <silent><expr> <CR>      compe#confirm('<CR>')
inoremap <silent><expr> <C-e>     compe#close('<C-e>')
inoremap <silent><expr> <C-f>     compe#scroll({ 'delta': +4 })
inoremap <silent><expr> <C-d>     compe#scroll({ 'delta': -4 })

hi link LspDiagnosticsFloatingError WarningMsg
hi link LspDiagnosticsFloatingWarning Label
hi link LspDiagnosticsFloatingHint Label
hi link LspDiagnosticsFloatingInformation Label

""""""""""""""""""""""""""""""""""""""""
" # Misc configurations

nnoremap <silent> <C-n> :NvimTreeToggle<CR>
nnoremap <silent> <leader>r :NvimTreeRefresh<CR>

" ### Vim Rooter
let g:rooter_manual_only = 1

" ### Git Gutter
autocmd BufWritePost * GitGutter
" lower priority on the gutter makes sure it's below the LSP
" (LSP should override gutter in display)
let g:gitgutter_sign_priority=9

" ### Firebase
let g:vim_firestore_warnings = 0

" ### Vim-Rainbow
let g:rainbow_active = 0 " toggle via :RainbowToggle

" ### Rust
let g:rustfmt_autosave = 1
autocmd BufReadPost *.rs setlocal filetype=rust

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

" ### Delimit Mate
let g:delimitMate_expand_cr = 2
let g:delimitMate_expand_space = 1
let g:delimitMate_matchpairs = "(:),[:],{:}"
" no quote completion
let delimitMate_quotes = ""
autocmd FileType vim,html let b:delimitMate_matchpairs = "(:),[:],{:},<:>"
