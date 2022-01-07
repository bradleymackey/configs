-- ** NEOVIM INIT SCRIPT **
-- Please install 'Packer' on your machine first, then run :PackerSync

require('plugins')
require('settings')
require('completion')
require('lsp')

-- Native Vim Scripts
vim.cmd 'source ~/.config/nvim/vim/colors.vim'
vim.cmd 'source ~/.config/nvim/vim/bindings.vim'
vim.cmd 'source ~/.config/nvim/vim/filetype.vim'
vim.cmd 'source ~/.config/nvim/vim/lightline.vim'
