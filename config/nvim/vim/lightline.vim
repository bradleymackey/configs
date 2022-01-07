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
