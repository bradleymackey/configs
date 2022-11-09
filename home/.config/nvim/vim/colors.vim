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

let s:lsp_tf='italic'

" Held down color
hi link LspReferenceRead Visual
hi link LspReferenceText Visual
hi link LspReferenceWrite Visual

sign define DiagnosticSignInformation text=@ texthl=Label linehl= numhl=Label
sign define DiagnosticSignHint text=> texthl=Label linehl= numhl=Label
sign define DiagnosticSignWarn text=* texthl=Label linehl= numhl=Label
sign define DiagnosticSignError text=! texthl=Error linehl= numhl=Error

hi link DiagnosticFloatingError WarningMsg
hi link DiagnosticFloatingWarning Label
hi link DiagnosticFloatingHint Label
hi link DiagnosticFloatingInformation Label
hi link DiagnosticVirtualTextError ErrorMsg
hi link DiagnosticVirtualTextWarning Label
hi link DiagnosticVirtualTextHint Label
hi link DiagnosticVirtualTextInformation Label
