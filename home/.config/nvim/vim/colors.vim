syntax on
set cursorline
set hlsearch
set t_Co=256
set background=dark
let base16colorspace=256
set termguicolors

if filereadable(expand("~/.vimrc_background"))
  source ~/.vimrc_background
endif

colorscheme base16-ia-dark
call g:Base16hi("MatchParen", g:base16_gui05, g:base16_gui03, g:base16_cterm05, g:base16_cterm03, "bold,italic", "")

" Override some of the LSP default colors

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

let s:lsp_tf='italic'

" Held down color
hi link LspReferenceRead Visual
hi link LspReferenceText Visual
hi link LspReferenceWrite Visual

exec 'hi DiagnosticVirtualTextError cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('ErrorMsg', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('ErrorMsg', 'fg', 'cterm')

exec 'hi DiagnosticVirtualTextWarning term=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')

exec 'hi DiagnosticVirtualTextHint term=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')

exec 'hi DiagnosticVirtualTextInformation cterm=' . s:lsp_tf . ' gui=' . s:lsp_tf .
            \' guibg=NONE' .
            \' guifg=' . s:get_syn('Label', 'fg', 'gui') .
            \' ctermbg=NONE' .
            \' ctermfg=' . s:get_syn('Label', 'fg', 'cterm')
sign define DiagnosticSignInformation text=@ texthl=Label linehl= numhl=Label
sign define DiagnosticSignHint text=> texthl=Label linehl= numhl=Label
sign define DiagnosticSignWarn text=* texthl=Label linehl= numhl=Label
sign define DiagnosticSignError text=! texthl=Error linehl= numhl=Error
hi link DiagnosticFloatingError WarningMsg
hi link DiagnosticFloatingWarning Label
hi link DiagnosticFloatingHint Label
hi link DiagnosticFloatingInformation Label
