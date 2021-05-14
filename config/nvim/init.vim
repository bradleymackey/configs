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

source $HOME/.config/nvim/nerd-tree.vim

""""""""""""""""""""""""""""""""""""""""
" LSP (using ALE for display)

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
let g:completion_matching_strategy_list = ['exact', 'substring', 'fuzzy']
imap <silent> <c-p> <Plug>(completion_trigger)

" Format and Lint with ALE
" (LSP is also routed through ALE, so LSP, and lint is all shown together in
" ALE)
let g:ale_fixers = ['prettier', 'fixjson', 'rustfmt']
let b:ale_linters = {
    \ 'javascript': ['eslint'], 
    \ 'typescript': ['eslint'],
    \ 'json': ['jsonlint']
    \ }
let g:ale_fix_on_save = 1
let g:ale_virtualtext_cursor = 1
let g:ale_virtualtext_prefix = '    > '
let g:ale_lint_on_text_changed = 'always'
let g:ale_lint_on_save = 1
let g:ale_set_loclist = 0
let g:ale_set_quickfix = 0

" eslint_d is faster!
let g:ale_javascript_eslint_use_global = 1
let g:ale_javascript_eslint_executable = 'eslint_d'

" prettier_d is faster!
let g:javascript_prettier_use_global = 1
let g:javascript_prettier_executable = 'prettier_d'

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
" # Misc configurations

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

" COMPLETION SUGGESTIONS
" Use <cr> to confirm completion (we use delimitMateCR to we also get this <cr> formatting), `<C-g>u` means break undo chain at current position.
" Coc only does snippet and additional edit on confirm.
imap <expr> <cr> pumvisible() ? "\<C-y>" : "\<C-g>u\<Plug>delimitMateCR"
" Or use `complete_info` if your vim support it, like:
imap <expr> <cr> complete_info()["selected"] != "-1" ? "\<C-y>" : "\<C-g>u\<Plug>delimitMateCR"
" Use <TAB> to select the popup menu:
inoremap <expr> <Tab> pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"

" ### Rust
let g:rustfmt_autosave = 1
autocmd BufReadPost *.rs setlocal filetype=rust

" Autocomplete Config
" suppress the annoying 'match x of y', 'The only match' and 'Pattern not
" found' messages

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
