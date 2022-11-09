syntax on
colorscheme base16-ia-dark
set cursorline
set hlsearch
set t_Co=256
set background=dark
let base16colorspace=256
set termguicolors

" MatchParen color is stupid, make it better
call g:Base16hi("MatchParen", g:base16_gui05, g:base16_gui03, g:base16_cterm05, g:base16_cterm03, "bold,italic", "")

" Held down color
hi link LspReferenceRead Visual
hi link LspReferenceText Visual
hi link LspReferenceWrite Visual
