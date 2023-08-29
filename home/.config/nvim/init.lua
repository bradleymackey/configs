-- ** NEOVIM INIT SCRIPT **

vim.g.mapleader = " "

require('settings')
require('lazy-config')
require('lazy').setup('lazy-plugins')
require('lsp')

-- Native Vim Scripts
local path = vim.fn.stdpath('config') .. '/vim/'
local sourced = 'source ' .. path
vim.cmd(sourced .. 'colors.vim')
vim.cmd(sourced .. 'diagnostics.vim')
vim.cmd(sourced .. 'bindings.vim')
vim.cmd(sourced .. 'filetype.vim')
