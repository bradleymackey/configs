" ** NEOVIM INIT SCRIPT **
" Please install 'Packer' on your machine first, then run :PackerSync

luafile $HOME/.config/nvim/plugins.lua
source $HOME/.config/nvim/colors.vim
source $HOME/.config/nvim/bindings.vim
luafile $HOME/.config/nvim/settings.lua
luafile $HOME/.config/nvim/completion.lua
luafile $HOME/.config/nvim/tree-sitter-init.lua
luafile $HOME/.config/nvim/lsp-init.lua
luafile $HOME/.config/nvim/todo-init.lua
luafile $HOME/.config/nvim/nvim-tree.lua
source $HOME/.config/nvim/filetype.vim
source $HOME/.config/nvim/lightline.vim
