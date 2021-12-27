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

" base16-snazzy
colorscheme base16-woodland
hi Normal ctermbg=NONE
call g:Base16hi("MatchParen", g:base16_gui05, g:base16_gui03, g:base16_cterm05, g:base16_cterm03, "bold,italic", "")

" nvim-cmp supports kind highlights, this scheme matches vs code dark,
" and looks pretty neat
highlight! CmpItemAbbrMatch guibg=NONE guifg=#569CD6
highlight! CmpItemAbbrMatchFuzzy guibg=NONE guifg=#569CD6
highlight! CmpItemKindFunction guibg=NONE guifg=#C586C0
highlight! CmpItemKindMethod guibg=NONE guifg=#C586C0
highlight! CmpItemKindVariable guibg=NONE guifg=#9CDCFE
highlight! CmpItemKindKeyword guibg=NONE guifg=#D4D4D4

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

" < 0.6
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
hi link LspDiagnosticsFloatingError WarningMsg
hi link LspDiagnosticsFloatingWarning Label
hi link LspDiagnosticsFloatingHint Label
hi link LspDiagnosticsFloatingInformation Label

" >= 0.6
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
