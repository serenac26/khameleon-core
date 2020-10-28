# create 256 x 256 tile for gallery navigation
# to run: python create_tile.py ~/dir/to/progressive_map/

from PIL import Image
import click

@click.command()
@click.argument("base_dir") # progressive_map
@click.option("--dim", default=500, help="tile dimension")
@click.option("--factor", default=32, help="factor level")
@click.option("--fname", default="default_tile_name", help="default tile name")
def main(base_dir, dim, factor, fname):
    print("base_dir %s" % (base_dir))
    dim_per_tile = int(float(dim) / factor) + 1
    half_d = dim_per_tile / 2.0
    level_1_dir = base_dir + "/%s" % factor
    im = Image.new("RGB", (dim, dim))
    pix = im.load()

    for i in range(0, factor):
        level_2_dir = level_1_dir + "/" + str(i)

        for j in range(0, factor):
            level_3_dir = level_2_dir + "/" + str(j) + ".jpg"
            pil_img = Image.open(level_3_dir)
            im_resized = pil_img.resize( (dim_per_tile, dim_per_tile), Image.ANTIALIAS)

            # read image
            x_min = j * dim_per_tile
            y_min = i * dim_per_tile
            x_max = (j+1) * dim_per_tile
            y_max = (i+1) * dim_per_tile

            im.paste(im_resized, (x_min, y_min))

            print("i %d j %d x_min %d y_min %d" % (i, j, x_min, y_min))

    im.save(fname+".jpg", "JPEG")
main()
