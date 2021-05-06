" Install vim-plug if it does not exist
if empty(glob('~/.vim/autoload/plug.vim'))
  silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs
    \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
  autocmd VimEnter * PlugInstall --sync | source $MYVIMRC
endif

" No LSP in ALE!
" nvim-lsp handles this, but routes it to ALE for display
" (this needs to be called before the plugin is sourced)
let g:ale_disable_lsp = 1

" Vim Plug Plugins
call plug#begin('~/.local/share/nvim/plugged')

" LSP
Plug 'neovim/nvim-lspconfig'
Plug 'nvim-lua/completion-nvim'
Plug 'dense-analysis/ale'
Plug 'nathunsmitty/nvim-ale-diagnostic'

" Fuzzy
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

" GUI
Plug 'luochen1990/rainbow'
Plug 'itchyny/lightline.vim'
Plug 'chriskempson/base16-vim'
Plug 'preservim/nerdtree'
Plug 'airblade/vim-gitgutter'

" Editor
" 'gcc' to comment line, 'gc' if in visual mode
Plug 'tomtom/tcomment_vim'
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
Plug 'airblade/vim-rooter'
Plug 'godlygeek/tabular'
" better than coc-pairs
" recursive <cr> maps should RECURSIVELY call `<Plug>delimitMateCR` in order
" to make sure that the correct delimiting calls are made
Plug 'Raimondi/delimitMate'

" Syntax
Plug 'delphinus/vim-firestore' " firebase *.rules file support
Plug 'digitaltoad/vim-pug'
Plug 'keith/swift.vim'

call plug#end()
