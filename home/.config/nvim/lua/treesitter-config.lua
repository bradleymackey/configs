-- Abstract:
-- Setup of 'treesitter', which provides semantic highlighting

-- ts_context_commentstring crashes on CursorHold when a buffer has no treesitter parser (terminals, help, etc.)
-- Disable its built-in autocmd and replace with a pcall-guarded one
require("ts_context_commentstring").setup({ enable_autocmd = false })
vim.api.nvim_create_autocmd("CursorHold", {
  callback = function()
    pcall(require("ts_context_commentstring.internal").update_commentstring)
  end,
})

local parsers = {
  "tsx",
  "typescript",
  "javascript",
  "html",
  "css",
  "vue",
  "astro",
  "svelte",
  "gitcommit",
  "graphql",
  "json",
  "json5",
  "lua",
  "markdown",
  "prisma",
  "vim",
  "nu",
}

require("nvim-treesitter").install(parsers)

local filetypes = {
  "tsx",
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "html",
  "css",
  "vue",
  "astro",
  "svelte",
  "gitcommit",
  "graphql",
  "json",
  "json5",
  "lua",
  "markdown",
  "prisma",
  "vim",
  "nu",
}

vim.api.nvim_create_autocmd("FileType", {
  pattern = filetypes,
  callback = function()
    pcall(vim.treesitter.start)
    vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
  end,
})

require("nvim-treesitter-textobjects").setup({
  select = {
    lookahead = true,
  },
  move = {
    set_jumps = true,
  },
})

-- Select
vim.keymap.set({ "x", "o" }, "af", function()
  require("nvim-treesitter-textobjects.select").select_textobject("@function.outer", "textobjects")
end)
vim.keymap.set({ "x", "o" }, "if", function()
  require("nvim-treesitter-textobjects.select").select_textobject("@function.inner", "textobjects")
end)
vim.keymap.set({ "x", "o" }, "ac", function()
  require("nvim-treesitter-textobjects.select").select_textobject("@class.outer", "textobjects")
end)
vim.keymap.set({ "x", "o" }, "ic", function()
  require("nvim-treesitter-textobjects.select").select_textobject("@class.inner", "textobjects")
end)

-- Move
vim.keymap.set({ "n", "x", "o" }, "]]", function()
  require("nvim-treesitter-textobjects.move").goto_next_start("@function.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "]m", function()
  require("nvim-treesitter-textobjects.move").goto_next_start("@class.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "][", function()
  require("nvim-treesitter-textobjects.move").goto_next_end("@function.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "]M", function()
  require("nvim-treesitter-textobjects.move").goto_next_end("@class.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "[[", function()
  require("nvim-treesitter-textobjects.move").goto_previous_start("@function.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "[m", function()
  require("nvim-treesitter-textobjects.move").goto_previous_start("@class.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "[]", function()
  require("nvim-treesitter-textobjects.move").goto_previous_end("@function.outer", "textobjects")
end)
vim.keymap.set({ "n", "x", "o" }, "[M", function()
  require("nvim-treesitter-textobjects.move").goto_previous_end("@class.outer", "textobjects")
end)

-- Swap
vim.keymap.set("n", "~", function()
  require("nvim-treesitter-textobjects.swap").swap_next("@parameter.inner")
end)
