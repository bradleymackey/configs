" Install vim-plug if it does not exist
if empty(glob('~/.vim/autoload/plug.vim'))
  silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs
    \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
  autocmd VimEnter * PlugInstall --sync | source $MYVIMRC
endif

" Vim Plug Plugins
call plug#begin('~/.local/share/nvim/plugged')

" LSP
Plug 'neovim/nvim-lspconfig'
Plug 'hrsh7th/nvim-compe'
Plug 'ray-x/lsp_signature.nvim'
Plug 'nvim-lua/lsp-status.nvim'
Plug 'nvim-lua/plenary.nvim'
Plug 'jose-elias-alvarez/null-ls.nvim'

" Fuzzy
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'

" GUI
Plug 'luochen1990/rainbow'
Plug 'itchyny/lightline.vim'
Plug 'chriskempson/base16-vim'
Plug 'airblade/vim-gitgutter'
Plug 'kyazdani42/nvim-web-devicons' " for file icons
Plug 'kyazdani42/nvim-tree.lua'
Plug 'wfxr/minimap.vim'

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
Plug 'folke/todo-comments.nvim'
" automatically adjust indent based on current file
Plug 'tpope/vim-sleuth'

" Syntax
Plug 'delphinus/vim-firestore' " firebase *.rules file support
Plug 'digitaltoad/vim-pug'
Plug 'keith/swift.vim'

call plug#end()
