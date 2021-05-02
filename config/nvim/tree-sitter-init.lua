-- Abstract:
-- Setup of 'treesitter', which provides semantic highlighting

local sitter = require('nvim-treesitter.configs')
sitter.setup {
    highlight = {
        enable = true
    }
}
