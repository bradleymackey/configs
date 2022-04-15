-- ** NEOVIM INIT SCRIPT **
-- Please install 'Packer' on your machine first, then run :PackerSync

require('plugins')
require('settings')
require('lsp')

-- Native Vim Scripts
local path = vim.fn.stdpath('config') .. '/vim/'
local sourced = 'source ' .. path
vim.cmd(sourced .. 'colors.vim')
vim.cmd(sourced .. 'bindings.vim')
vim.cmd(sourced .. 'filetype.vim')
vim.cmd(sourced .. 'lightline.vim')
