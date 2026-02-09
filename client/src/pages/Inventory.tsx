import { useState } from "react";
import { useProducts, useCreateProduct, useDeleteProduct, useBrands } from "@/hooks/use-products";
import { useBrands as useBrandsList } from "@/hooks/use-others";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Edit, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Schema for form (coercing numbers)
const productFormSchema = insertProductSchema.extend({
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  brandId: z.coerce.number().optional(),
});

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: products, isLoading } = useProducts(search);
  const { data: brands } = useBrandsList();
  
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      barcode: "",
      description: "",
      price: 0,
      stock: 0,
    },
  });

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    // Ensure decimal price is handled as string for backend if needed, or number
    // Schema expects number/string based on definition. Drizzle decimal is string in JS usually, but Zod schema might vary.
    // The extended schema above coerces to number. The API hook handles it.
    createProduct(data as any, {
      onSuccess: () => {
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Success", description: "Product created successfully" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to create product" });
      }
    });
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage products, stock levels, and pricing</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Premium Coffee Beans" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input placeholder="Scan or type..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select brand" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands?.map(b => (
                              <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>create Product</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border max-w-md">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search by name or barcode..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Product Info</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
               </TableRow>
            ) : products?.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No products found.</TableCell>
               </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>
                  </TableCell>
                  <TableCell>{product.brand?.name || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-bold
                      ${product.stock === 0 ? 'bg-red-100 text-red-700' : product.stock < 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}
                    `}>
                      {product.stock} units
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => {
                          if (confirm("Are you sure?")) deleteProduct(product.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
