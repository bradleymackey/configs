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

colorscheme base16-gruvbox-dark-hard
hi Normal ctermbg=NONE

" Brighter comments
call g:Base16hi("Comment", "737571", "", "737571", "", "", "")
call g:Base16hi("MatchParen", g:base16_gui05, g:base16_gui03, g:base16_cterm05, g:base16_cterm03, "bold,italic", "")
