def traverse(node)
  return node if node.is_a?(String)

  unless node.try(:name).nil?
    part = { name: node.name }
    part[:blob] = true if node.escaper.call("/") == "/"
    return part
  end

  # These are instance variables of: Rails - ActionDispatch::Journey::Format

  parts = node.instance_variable_get(:@parts).map { |p| traverse(p) }
  # array of indexes to other nodes in `parts`
  children = node.instance_variable_get(:@children)
  # array of indexes to other required params in `parts`
  parameters = node.instance_variable_get(:@parameters)

  # The following is just an optimization to join adjacent strings.
  # a non-string appears at each of the indexes stored in `children`
  # and `parameters`, so the rest are strings

  new_parts = []

  last = 0
  (children + parameters).sort.each do |idx|
    new_parts.push(parts[last..(idx - 1)].join) if idx - last > 0
    new_parts.push(parts[idx])
    last = idx + 1
  end
  new_parts.push(parts[last..(parts.length - 1)].join) if last < parts.length

  new_parts
end

routes = {}

Rails.application.routes.named_routes.each do |_, r|
  next if r.internal

  ast = traverse(r.instance_variable_get(:@path_formatter))

  # Remove the regex `(.:format)` that appears at the end of most routes
  ast.pop if (ast[-1].dig(1, :name) rescue nil) == :format

  routes[r.name] =
    # Just pass a string if the route is static
    if ast.length == 1 && ast[0].is_a?(String)
      ast[0]
    else
      ast
    end
end

puts routes.to_json
